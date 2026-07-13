"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, relative, resolve, sep } = require("node:path");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const TEMPORARY_ROOT = mkdtempSync(join(tmpdir(), "fradamroyal-navigation-"));
const BUILD_ROOT = join(TEMPORARY_ROOT, "public");
const BASE_URL = "https://fradamroyal.com/";
const DEPLOYMENT_CONFIG_PATH = join(REPOSITORY_ROOT, "wrangler.toml");
const LOW_VALUE_COLLECTION_ROOTS = ["categories", "posts", "series", "tags"];
const REQUIRED_YEAR_ARCHIVES = new Map([
  ["homilies", ["2024", "2025", "2026"]],
  ["reflections", ["2024", "2025", "2026"]],
]);

let allFiles;
let allHTMLPages;
let pages;
let pagesByURL;
let articles;
let hugoConfig;
let sitemapURLs;

function outputFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return outputFiles(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

function isRedirectPage(html) {
  return /<meta\b[^>]*\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh)(?:\s|>)/i.test(html);
}

function attributes(element) {
  const result = new Map();
  const content = element
    .replace(/^<[^\s>]+/i, "")
    .replace(/\s*>$/, "");
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    result.set(
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }

  return result;
}

function hasClass(elementAttributes, className) {
  return (elementAttributes.get("class") || "")
    .split(/\s+/)
    .includes(className);
}

function elementsWithClass(html, tagName, className) {
  const elements = [];
  const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const startTag = match[0].match(new RegExp(`^<${tagName}\\b[^>]*>`, "i"))[0];
    const elementAttributes = attributes(startTag);
    if (hasClass(elementAttributes, className)) {
      elements.push({
        attributes: elementAttributes,
        html: match[0],
        innerHTML: match[0]
          .replace(new RegExp(`^<${tagName}\\b[^>]*>`, "i"), "")
          .replace(new RegExp(`<\\/${tagName}>$`, "i"), ""),
      });
    }
  }

  return elements;
}

function elementWithClass(html, tagName, className, relativePath) {
  const elements = elementsWithClass(html, tagName, className);
  assert.equal(
    elements.length,
    1,
    `Expected exactly one ${tagName}.${className} in ${relativePath}.`,
  );
  return elements[0];
}

function assertVisible(element, description) {
  assert.equal(
    element.attributes.has("hidden"),
    false,
    `Expected ${description} not to have the hidden attribute.`,
  );
  assert.notEqual(
    (element.attributes.get("aria-hidden") || "").toLowerCase(),
    "true",
    `Expected ${description} not to be hidden from accessibility APIs.`,
  );
}

function decodeHTML(value) {
  const namedEntities = new Map([
    ["amp", "&"],
    ["apos", "'"],
    ["gt", ">"],
    ["lt", "<"],
    ["nbsp", " "],
    ["quot", '"'],
  ]);

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (entity, decimal, hex, name) => {
    if (decimal) {
      return String.fromCodePoint(Number.parseInt(decimal, 10));
    }
    if (hex) {
      return String.fromCodePoint(Number.parseInt(hex, 16));
    }
    return namedEntities.get(name.toLowerCase()) ?? entity;
  });
}

function textContent(html) {
  return decodeHTML(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function anchors(html) {
  const result = [];
  const pattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const startTag = match[0].match(/^<a\b[^>]*>/i)[0];
    const anchorAttributes = attributes(startTag);
    if (anchorAttributes.has("href")) {
      result.push({
        attributes: anchorAttributes,
        href: decodeHTML(anchorAttributes.get("href")),
        name: textContent(match[0]),
      });
    }
  }

  return result;
}

function structuredData(html, relativePath) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => {
      const type = attributes(`<script${match[1]}>`).get("type") || "";
      return type.toLowerCase() === "application/ld+json";
    });
  assert.equal(scripts.length, 1, `Expected one JSON-LD script in ${relativePath}.`);
  return JSON.parse(scripts[0][2]);
}

function nodeByType(document, type, relativePath) {
  const result = document["@graph"].find((node) => {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    return types.includes(type);
  });
  assert.ok(result, `Expected ${type} structured data in ${relativePath}.`);
  return result;
}

function scriptureCitations(citations = []) {
  const values = Array.isArray(citations) ? citations : [citations];
  const parsed = values.flatMap((value) => {
    const separator = value.indexOf(": ");
    if (separator === -1) {
      const citation = value.trim();
      return citation ? [citation] : [];
    }

    const label = value.slice(0, separator).trim();
    const citation = value.slice(separator + 2).trim();
    const normalizedLabel = label.toLowerCase();
    const isResponsorial =
      normalizedLabel.includes("psalm") || normalizedLabel.includes("canticle");
    return citation && !isResponsorial ? [citation] : [];
  });
  return [...new Set(parsed)];
}

function relatedReason(shared) {
  const shown = shared.slice(0, 2).join("; ");
  if (shared.length === 1) {
    return `Shared reading: ${shown}`;
  }
  if (shared.length === 2) {
    return `Shared readings: ${shown}`;
  }
  return `${shared.length} shared readings: ${shown}; and ${shared.length - 2} more`;
}

function generatedURL(relativePath) {
  if (relativePath === "index.html") {
    return BASE_URL;
  }
  if (relativePath.endsWith("/index.html")) {
    return new URL(`/${relativePath.slice(0, -"index.html".length)}`, BASE_URL).href;
  }
  return new URL(`/${relativePath}`, BASE_URL).href;
}

function internalURL(href, sourceURL) {
  let target;
  try {
    target = new URL(href, sourceURL);
  } catch {
    return undefined;
  }
  return target.origin === new URL(BASE_URL).origin && ["http:", "https:"].includes(target.protocol)
    ? target
    : undefined;
}

function outputCandidates(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }
  const path = pathname.replace(/^\/+/, "");

  if (path === "") {
    return ["index.html"];
  }
  if (pathname.endsWith("/")) {
    return [`${path}index.html`];
  }
  return [path, `${path}/index.html`, `${path}.html`];
}

function page(relativePath) {
  const result = pages.get(relativePath);
  assert.ok(result, `Expected Hugo to generate ${relativePath}.`);
  return result;
}

function isIndexable(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
  return !metas.some((meta) => {
    const name = (meta.get("name") || "").toLowerCase();
    const directives = (meta.get("content") || "").toLowerCase().split(/[\s,]+/);
    return name === "robots" && directives.includes("noindex");
  });
}

function relativePathForURL(url) {
  const candidates = outputCandidates(url);
  return candidates.find((candidate) => pages.has(candidate));
}

function articlePathParts(relativePath) {
  return relativePath.match(/^(homilies|reflections)\/(\d{4})\/[^/]+\/index\.html$/);
}

function breadcrumbItems(nav, pageURL, relativePath) {
  const listItems = [...nav.innerHTML.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  assert.ok(listItems.length > 0, `Expected ordered breadcrumb items in ${relativePath}.`);

  return listItems.map((match, index) => {
    const itemAnchors = anchors(match[1]);
    assert.ok(itemAnchors.length <= 1, `Expected at most one link in breadcrumb ${index + 1} of ${relativePath}.`);
    if (itemAnchors.length === 1) {
      return {
        name: itemAnchors[0].name,
        url: new URL(itemAnchors[0].href, pageURL).href,
      };
    }

    const current = match[1].match(/<span\b[^>]*>([\s\S]*?)<\/span>/i);
    assert.ok(current, `Expected breadcrumb ${index + 1} in ${relativePath} to be a link or span.`);
    assert.equal(
      index,
      listItems.length - 1,
      `Expected only the current breadcrumb to be non-linked in ${relativePath}.`,
    );
    return { name: textContent(current[1]), url: pageURL };
  });
}

function reachablePages(startURL, maximumDepth) {
  const distances = new Map([[startURL, 0]]);
  const queue = [startURL];

  while (queue.length > 0) {
    const sourceURL = queue.shift();
    const depth = distances.get(sourceURL);
    if (depth === maximumDepth) {
      continue;
    }

    const source = pagesByURL.get(sourceURL);
    if (!source) {
      continue;
    }
    anchors(source).forEach((anchor) => {
      const target = internalURL(anchor.href, sourceURL);
      const targetPath = target && relativePathForURL(target);
      if (!targetPath) {
        return;
      }
      const targetURL = generatedURL(targetPath);
      if (!distances.has(targetURL)) {
        distances.set(targetURL, depth + 1);
        queue.push(targetURL);
      }
    });
  }

  return distances;
}

test.before(() => {
  const config = spawnSync("hugo", ["config"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
  assert.equal(config.error, undefined, config.error && config.error.message);
  assert.equal(
    config.status,
    0,
    `Unable to resolve Hugo configuration.\n${config.stdout || ""}\n${config.stderr || ""}`,
  );
  hugoConfig = config.stdout;

  const build = spawnSync(
    "hugo",
    ["--gc", "--minify", "--destination", BUILD_ROOT],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
    },
  );
  assert.equal(build.error, undefined, build.error && build.error.message);
  assert.equal(
    build.status,
    0,
    `Hugo build failed.\n${build.stdout || ""}\n${build.stderr || ""}`,
  );

  const files = outputFiles(BUILD_ROOT);
  allFiles = new Set(
    files.map((path) => relative(BUILD_ROOT, path).split(sep).join("/")),
  );
  allHTMLPages = new Map(
    files
      .filter((path) => path.endsWith(".html"))
      .map((path) => {
        const relativePath = relative(BUILD_ROOT, path).split(sep).join("/");
        return [relativePath, readFileSync(path, "utf8")];
      }),
  );
  pages = new Map(
    [...allHTMLPages].filter(([, html]) => !isRedirectPage(html)),
  );
  pagesByURL = new Map(
    [...pages].map(([relativePath, html]) => [generatedURL(relativePath), html]),
  );
  const sitemap = readFileSync(join(BUILD_ROOT, "sitemap.xml"), "utf8");
  sitemapURLs = new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHTML(match[1])),
  );
  articles = [...pages]
    .filter(([relativePath]) => articlePathParts(relativePath))
    .map(([relativePath, html]) => {
      const [, section, year] = articlePathParts(relativePath);
      const document = structuredData(html, relativePath);
      const article = nodeByType(document, "BlogPosting", relativePath);
      return {
        citations: scriptureCitations(article.citation),
        datePublished: article.datePublished,
        html,
        relativePath,
        section,
        title: article.headline,
        url: generatedURL(relativePath),
        year,
      };
    });
});

test.after(() => {
  rmSync(TEMPORARY_ROOT, { recursive: true, force: true });
});

test("production pagination shows twelve articles per full archive page", () => {
  const pagerSize = hugoConfig.match(/^\s*pagersize\s*=\s*(\d+)\s*$/im);
  assert.ok(pagerSize, "Expected resolved Hugo configuration to contain pagination.pagerSize.");
  assert.equal(Number.parseInt(pagerSize[1], 10), 12);

  ["index.html", "homilies/index.html"].forEach((relativePath) => {
    const previews = elementsWithClass(page(relativePath), "article", "post-preview");
    assert.equal(previews.length, 12, `Expected a full 12-item archive page in ${relativePath}.`);
  });
});

test("low-value crawl surfaces are absent while canonical content remains indexed", () => {
  LOW_VALUE_COLLECTION_ROOTS.forEach((root) => {
    assert.equal(
      [...allFiles].some((relativePath) => relativePath.startsWith(`${root}/`)),
      false,
      `Expected Hugo not to generate the unused ${root} collection.`,
    );
    assert.equal(
      sitemapURLs.has(new URL(`/${root}/`, BASE_URL).href),
      false,
      `Expected the sitemap not to expose /${root}/.`,
    );
  });

  const retainedPaths = new Set([
    "index.html",
    "about/index.html",
    "homilies/index.html",
    "reflections/index.html",
    "tools/index.html",
    "tools/bible-reading-plan/index.html",
    ...[...REQUIRED_YEAR_ARCHIVES].flatMap(([section, years]) =>
      years.map((year) => `${section}/${year}/index.html`),
    ),
    ...articles.map((article) => article.relativePath),
  ]);

  retainedPaths.forEach((relativePath) => {
    assert.ok(pages.has(relativePath), `Expected Hugo to retain ${relativePath}.`);
    assert.ok(
      sitemapURLs.has(generatedURL(relativePath)),
      `Expected the sitemap to retain ${generatedURL(relativePath)}.`,
    );
  });

  sitemapURLs.forEach((url) => {
    const html = pagesByURL.get(url);
    assert.ok(html, `Expected sitemap URL ${url} to resolve to canonical output.`);
    assert.ok(isIndexable(html), `Expected sitemap URL ${url} to remain indexable.`);
  });
});

test("custom 404 page provides useful recovery paths without entering the sitemap", () => {
  const relativePath = "404.html";
  const html = page(relativePath);
  const pageURL = generatedURL(relativePath);
  const main = html.match(/<main\b([^>]*)>([\s\S]*?)<\/main>/i);
  assert.ok(main, `Expected a main recovery region in ${relativePath}.`);

  const recoveryRegion = {
    attributes: attributes(`<main${main[1]}>`),
    html: main[0],
    innerHTML: main[2],
  };
  assertVisible(recoveryRegion, `main recovery region in ${relativePath}`);
  assert.match(
    textContent(recoveryRegion.innerHTML),
    /(?:not found|could not find|cannot find|does not exist|missing|unavailable|no longer be available)/i,
    `Expected ${relativePath} to explain that the requested page is unavailable.`,
  );

  const recoveryLinks = anchors(recoveryRegion.innerHTML).map((anchor) => ({
    name: anchor.name,
    url: new URL(anchor.href, pageURL).href,
  }));
  [
    ["Home", "index.html"],
    ["Homilies", "homilies/index.html"],
    ["Reflections", "reflections/index.html"],
    ["Tools", "tools/index.html"],
  ].forEach(([name, targetPath]) => {
    const targetURL = generatedURL(targetPath);
    assert.ok(
      recoveryLinks.some((link) => link.name === name && link.url === targetURL),
      `Expected ${relativePath} to provide a visible ${name} recovery link to ${targetURL}.`,
    );
  });

  assert.equal(
    sitemapURLs.has(pageURL),
    false,
    `Expected the error document ${pageURL} to stay out of the sitemap.`,
  );
  assert.match(
    readFileSync(DEPLOYMENT_CONFIG_PATH, "utf8"),
    /^\s*not_found_handling\s*=\s*["']404-page["']\s*$/m,
    "Expected the static host to serve the custom error document with HTTP 404.",
  );
});

test("section roots expose complete, compact year archives", () => {
  REQUIRED_YEAR_ARCHIVES.forEach((years, section) => {
    const sectionPath = `${section}/index.html`;
    const archiveNav = elementWithClass(page(sectionPath), "nav", "year-archives", sectionPath);
    assertVisible(archiveNav, `nav.year-archives in ${sectionPath}`);
    const archiveLinks = anchors(archiveNav.html).map((anchor) =>
      new URL(anchor.href, generatedURL(sectionPath)).href,
    );

    years.forEach((year) => {
      const archivePath = `${section}/${year}/index.html`;
      const archiveURL = generatedURL(archivePath);
      assert.ok(archiveLinks.includes(archiveURL), `Expected ${sectionPath} to link ${archiveURL}.`);
      assert.equal(
        pages.has(`${section}/${year}/page/2/index.html`),
        false,
        `Expected ${archiveURL} to remain unpaginated.`,
      );

      const archiveHTML = page(archivePath);
      const expectedArticles = articles.filter(
        (article) => article.section === section && article.year === year,
      );
      assert.ok(expectedArticles.length > 0, `Expected ${section}/${year} to contain articles.`);

      const archiveArticleLinks = anchors(archiveHTML)
        .map((anchor) => ({
          name: anchor.name,
          url: new URL(anchor.href, archiveURL).href,
        }))
        .filter((anchor) => expectedArticles.some((article) => article.url === anchor.url));
      assert.deepEqual(
        new Set(archiveArticleLinks.map((anchor) => anchor.url)),
        new Set(expectedArticles.map((article) => article.url)),
        `Expected ${archivePath} to link every ${section} article from ${year}.`,
      );
      expectedArticles.forEach((article) => {
        const link = archiveArticleLinks.find((anchor) => anchor.url === article.url);
        assert.equal(link.name, article.title, `Expected ${archivePath} to show the title for ${article.url}.`);
      });

      const visibleDates = [...archiveHTML.matchAll(/<time\b[^>]*>/gi)]
        .map((match) => attributes(match[0]).get("datetime"))
        .filter(Boolean)
        .map((date) => date.slice(0, 10))
        .sort();
      const publicationDates = expectedArticles
        .map((article) => article.datePublished.slice(0, 10))
        .sort();
      assert.deepEqual(
        visibleDates,
        publicationDates,
        `Expected ${archivePath} to show one machine-readable publication date per article.`,
      );
    });
  });
});

test("visible breadcrumbs match BreadcrumbList structured data", () => {
  [...pages].forEach(([relativePath, html]) => {
    if (relativePath === "index.html" || !isIndexable(html)) {
      return;
    }

    const url = generatedURL(relativePath);
    const nav = elementWithClass(html, "nav", "breadcrumbs", relativePath);
    assertVisible(nav, `nav.breadcrumbs in ${relativePath}`);
    const visibleItems = breadcrumbItems(nav, url, relativePath);

    const document = structuredData(html, relativePath);
    const breadcrumbList = nodeByType(document, "BreadcrumbList", relativePath);
    const structuredItems = breadcrumbList.itemListElement.map((item, index) => {
      assert.equal(item.position, index + 1, `Expected ordered BreadcrumbList positions in ${relativePath}.`);
      return { name: item.name, url: item.item };
    });
    assert.deepEqual(
      visibleItems,
      structuredItems,
      `Expected visible and structured breadcrumbs to agree in ${relativePath}.`,
    );
  });
});

test("article navigation links the chronological neighbors within each section", () => {
  let crossYearLinks = 0;

  for (const section of ["homilies", "reflections"]) {
    const sectionArticles = articles
      .filter((article) => article.section === section)
      .sort((left, right) =>
        Date.parse(left.datePublished) - Date.parse(right.datePublished) ||
        left.url.localeCompare(right.url),
      );

    sectionArticles.forEach((article, index) => {
      const nav = elementWithClass(
        article.html,
        "nav",
        "article-navigation",
        article.relativePath,
      );
      assertVisible(nav, `nav.article-navigation in ${article.relativePath}`);
      const linkedURLs = anchors(nav.html).map((anchor) => {
        const target = internalURL(anchor.href, article.url);
        assert.ok(target, `Expected article navigation in ${article.relativePath} to stay internal.`);
        const targetPath = relativePathForURL(target);
        assert.ok(targetPath, `Expected ${target.href} from ${article.relativePath} to resolve.`);
        const parts = articlePathParts(targetPath);
        assert.ok(parts, `Expected ${target.href} from ${article.relativePath} to be an article.`);
        assert.equal(parts[1], section, `Expected ${target.href} to stay within ${section}.`);
        if (parts[2] !== article.year) {
          crossYearLinks += 1;
        }
        return generatedURL(targetPath);
      });

      const expectedURLs = [sectionArticles[index - 1], sectionArticles[index + 1]]
        .filter(Boolean)
        .map((neighbor) => neighbor.url);
      assert.deepEqual(
        new Set(linkedURLs),
        new Set(expectedURLs),
        `Expected ${article.relativePath} to link only its immediate chronological neighbors.`,
      );
    });
  }

  assert.ok(crossYearLinks > 0, "Expected at least one adjacent-article link to cross a year boundary.");
});

test("related homilies use only exact shared non-responsorial Scripture citations", () => {
  const homilies = articles.filter((article) => article.section === "homilies");

  homilies.forEach((article) => {
    const matches = homilies
      .filter((candidate) => candidate.url !== article.url)
      .map((candidate) => ({
        candidate,
        shared: article.citations.filter((citation) => candidate.citations.includes(citation)),
      }))
      .filter((match) => match.shared.length > 0);
    const byNewest = (left, right) =>
      Date.parse(right.candidate.datePublished) - Date.parse(left.candidate.datePublished) ||
      left.candidate.url.localeCompare(right.candidate.url);
    const expected = [
      ...matches.filter((match) => match.shared.length >= 2).sort(byNewest),
      ...matches.filter((match) => match.shared.length === 1).sort(byNewest),
    ].slice(0, 3);
    const relatedNavs = elementsWithClass(article.html, "nav", "related-homilies");

    if (expected.length === 0) {
      assert.equal(
        relatedNavs.length,
        0,
        `Expected no related homilies without exact Scripture overlap in ${article.relativePath}.`,
      );
      return;
    }

    assert.equal(
      relatedNavs.length,
      1,
      `Expected one related-homilies nav in ${article.relativePath}.`,
    );
    const nav = relatedNavs[0];
    assertVisible(nav, `nav.related-homilies in ${article.relativePath}`);
    assert.equal(nav.attributes.get("aria-labelledby"), "related-homilies-title");
    const heading = nav.innerHTML.match(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/i);
    assert.ok(heading, `Expected a visible related-homilies heading in ${article.relativePath}.`);
    assert.equal(attributes(`<h2${heading[1]}>`).get("id"), "related-homilies-title");
    assert.equal(textContent(heading[2]), "Related homilies");

    const listItems = [...nav.innerHTML.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    assert.equal(listItems.length, expected.length, `Unexpected related-link count in ${article.relativePath}.`);

    const actualURLs = [];
    listItems.forEach((match) => {
      const itemLinks = anchors(match[1]);
      assert.equal(itemLinks.length, 1, `Expected one link per related item in ${article.relativePath}.`);
      const targetURL = new URL(itemLinks[0].href, article.url).href;
      const relationship = expected.find((entry) => entry.candidate.url === targetURL);
      assert.ok(relationship, `Unexpected related homily ${targetURL} in ${article.relativePath}.`);
      assert.equal(
        itemLinks[0].name,
        `${relationship.candidate.title} (${relationship.candidate.year})`,
        `Expected the related link to distinguish the article year in ${article.relativePath}.`,
      );

      const reasons = elementsWithClass(match[1], "span", "related-homily-reason");
      assert.equal(reasons.length, 1, `Expected a visible relationship reason for ${targetURL}.`);
      assert.equal(
        textContent(reasons[0].html),
        relatedReason(relationship.shared),
        `Expected exact shared citations to explain ${targetURL} in ${article.relativePath}.`,
      );
      actualURLs.push(targetURL);
    });

    assert.deepEqual(
      actualURLs,
      expected.map((entry) => entry.candidate.url),
      `Expected the strongest exact Scripture relationships first in ${article.relativePath}.`,
    );
  });

  const allSaints = page("homilies/2025/all_saints/index.html");
  const allSaintsLinks = anchors(
    elementWithClass(allSaints, "nav", "related-homilies", "homilies/2025/all_saints/index.html").html,
  ).map((anchor) => new URL(anchor.href, BASE_URL).href);
  assert.deepEqual(
    allSaintsLinks,
    [
      "https://fradamroyal.com/homilies/2024/all_saints/",
      "https://fradamroyal.com/homilies/2026/fourth_sunday_ordinary_time/",
    ],
    "Expected the recurring All Saints homily to precede a newer one-passage match.",
  );

  const easterSundayLinks = anchors(
    elementWithClass(
      page("homilies/2026/easter_sunday/index.html"),
      "nav",
      "related-homilies",
      "homilies/2026/easter_sunday/index.html",
    ).html,
  ).map((anchor) => new URL(anchor.href, BASE_URL).href);
  assert.deepEqual(
    easterSundayLinks,
    ["https://fradamroyal.com/homilies/2025/easter_sunday/"],
    "Expected citations to match exactly rather than by overlapping book and verse text.",
  );

  assert.equal(
    elementsWithClass(
      page("homilies/2026/sixth_sunday_easter/index.html"),
      "nav",
      "related-homilies",
    ).length,
    0,
    "Expected a Psalm-only overlap not to create a related-homilies section.",
  );
});

test("every generated internal HTML link resolves to generated output", () => {
  allHTMLPages.forEach((html, relativePath) => {
    const sourceURL = generatedURL(relativePath);
    anchors(html).forEach((anchor) => {
      const target = internalURL(anchor.href, sourceURL);
      if (!target) {
        return;
      }
      assert.ok(
        outputCandidates(target).some((candidate) => allFiles.has(candidate)),
        `Expected internal href ${anchor.href} in ${relativePath} to resolve to generated output.`,
      );
    });
  });
});

test("every homily and reflection is reachable from Home within three links", () => {
  const distances = reachablePages(BASE_URL, 3);
  articles.forEach((article) => {
    assert.ok(
      distances.has(article.url),
      `Expected ${article.url} to be reachable from Home within three link traversals.`,
    );
  });
});

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
const {
  LEGACY_HOMILY_MIGRATIONS,
} = require("./fixtures/legacy-homily-migrations.js");
const {
  REFLECTION_HEADING_HIERARCHIES,
} = require("./fixtures/reflection-heading-hierarchies.js");

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

function startTagsWithClass(html, tagName, className) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return [...html.matchAll(pattern)]
    .map((match) => ({
      attributes: attributes(match[0]),
      html: match[0],
      offset: match.index,
    }))
    .filter((element) => hasClass(element.attributes, className));
}

function unnestedElementWithClass(html, tagName, className, relativePath) {
  const startTags = startTagsWithClass(html, tagName, className);
  assert.equal(
    startTags.length,
    1,
    `Expected exactly one ${tagName}.${className} in ${relativePath}.`,
  );

  const startTag = startTags[0];
  const innerOffset = startTag.offset + startTag.html.length;
  const closingTag = `</${tagName}>`;
  const closingOffset = html.indexOf(closingTag, innerOffset);
  assert.notEqual(
    closingOffset,
    -1,
    `Expected ${tagName}.${className} to have a closing tag in ${relativePath}.`,
  );
  const innerHTML = html.slice(innerOffset, closingOffset);
  assert.doesNotMatch(
    innerHTML,
    new RegExp(`<${tagName}\\b`, "i"),
    `Expected ${tagName}.${className} not to nest another ${tagName} in ${relativePath}.`,
  );

  return {
    attributes: startTag.attributes,
    html: html.slice(startTag.offset, closingOffset + closingTag.length),
    innerHTML,
    offset: startTag.offset,
  };
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

function renderedHeadings(html) {
  return [...html.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)].map(
    (match) => ({
      attributes: attributes(`<h${match[1]}${match[2]}>`),
      level: Number.parseInt(match[1], 10),
      text: decodeHTML(match[3].replace(/<[^>]*>/g, ""))
        .replace(/\s+/g, " ")
        .trim(),
    }),
  );
}

function visibleReadings(html, relativePath) {
  const sections = elementsWithClass(html, "section", "homily-readings");
  assert.ok(
    sections.length <= 1,
    `Expected at most one Scripture-readings section in ${relativePath}.`,
  );
  if (sections.length === 0) {
    return [];
  }

  const section = sections[0];
  assertVisible(section, `Scripture-readings section in ${relativePath}`);
  assert.equal(section.attributes.get("aria-label"), "Scripture readings");
  const list = elementWithClass(
    section.innerHTML,
    "ul",
    "homily-readings-list",
    relativePath,
  );
  const items = [...list.innerHTML.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  assert.ok(items.length > 0, `Expected visible readings in ${relativePath}.`);

  return items.map((match, index) => {
    const labels = elementsWithClass(
      match[1],
      "span",
      "homily-reading-label",
    );
    const citations = elementsWithClass(
      match[1],
      "span",
      "homily-reading-citation",
    );
    assert.ok(
      labels.length <= 1,
      `Expected at most one label for reading ${index + 1} in ${relativePath}.`,
    );
    assert.equal(
      citations.length,
      1,
      `Expected one citation for reading ${index + 1} in ${relativePath}.`,
    );
    labels.forEach((label) =>
      assertVisible(label, `reading label in ${relativePath}`),
    );
    assertVisible(citations[0], `reading citation in ${relativePath}`);
    return textContent(match[1]);
  });
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

function nodeForReference(document, reference, relativePath) {
  assert.deepEqual(
    Object.keys(reference),
    ["@id"],
    `Expected an @id-only reference in ${relativePath}.`,
  );
  const result = document["@graph"].find((node) => node["@id"] === reference["@id"]);
  assert.ok(result, `Expected ${reference["@id"]} to resolve within ${relativePath}.`);
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

test("section introductions appear once while the home page remains introduction-free", () => {
  const expectations = new Map([
    [
      "homilies/index.html",
      {
        primaryContent: [
          ["nav", "year-archives"],
          ["div", "posts-list"],
        ],
        text: "These homilies were preached at masses throughout the liturgical year. Most Sundays and Days of Obligation are present. There are occasional festal or ferial homilies as well. Browse recent homilies below, or use the year archives to jump to a particular year.",
      },
    ],
    [
      "reflections/index.html",
      {
        primaryContent: [
          ["nav", "year-archives"],
          ["div", "posts-list"],
        ],
        text: "These reflections consider Scripture, prayer, and Catholic life and most were preached at various parishes or ministry events. Occasional personal reflections may also be posted. Browse recent reflections below, or use the year archives to jump to a particular year.",
      },
    ],
  ]);

  const homeHTML = page("index.html");
  assert.equal(
    startTagsWithClass(homeHTML, "div", "archive-introduction").length,
    0,
    "Expected the home page not to render an archive introduction.",
  );
  assert.equal(
    [...homeHTML.matchAll(/<h1\b[^>]*>/gi)].length,
    1,
    "Expected the introduction-free home page to retain one H1.",
  );
  assert.equal(
    startTagsWithClass(homeHTML, "div", "posts-list").length,
    1,
    "Expected the introduction-free home page to retain its article list.",
  );

  expectations.forEach(({ primaryContent, text }, relativePath) => {
    const html = page(relativePath);
    const introduction = unnestedElementWithClass(
      html,
      "div",
      "archive-introduction",
      relativePath,
    );
    assertVisible(introduction, `div.archive-introduction in ${relativePath}`);
    assert.equal(textContent(introduction.innerHTML), text);
    assert.equal(
      [...html.matchAll(/<h1\b[^>]*>/gi)].length,
      1,
      `Expected the introduction not to add another H1 in ${relativePath}.`,
    );

    primaryContent.forEach(([tagName, className]) => {
      const primary = elementWithClass(html, tagName, className, relativePath);
      assert.ok(
        introduction.offset < html.indexOf(primary.html),
        `Expected the introduction to precede ${tagName}.${className} in ${relativePath}.`,
      );
    });
  });

  REQUIRED_YEAR_ARCHIVES.forEach((years, section) => {
    years.forEach((year) => {
      const relativePath = `${section}/${year}/index.html`;
      const introduction = unnestedElementWithClass(
        page(relativePath),
        "div",
        "archive-introduction",
        relativePath,
      );
      assertVisible(introduction, `div.archive-introduction in ${relativePath}`);
      assert.equal(
        textContent(introduction.innerHTML),
        `Browse ${section} published in ${year}.`,
      );
    });
  });
});

test("section introductions stay out of paginator pages, previews, and feeds", () => {
  const introductionFragments = [
    "preached at masses throughout the liturgical year",
    "preached at various parishes or ministry events",
  ];

  const paginatorPages = [...pages].filter(([relativePath]) =>
    /^(?:page|homilies\/page|reflections\/page)\/\d+\/index\.html$/.test(relativePath),
  );
  assert.ok(
    paginatorPages.length > 0,
    "Expected at least one generated paginator page for introduction-isolation coverage.",
  );
  paginatorPages.forEach(([relativePath, html]) => {
    assert.equal(
      startTagsWithClass(html, "div", "archive-introduction").length,
      0,
      `Expected ${relativePath} not to repeat the archive introduction.`,
    );
  });

  ["index.html", "homilies/index.html", "reflections/index.html"].forEach(
    (relativePath) => {
      elementsWithClass(page(relativePath), "article", "post-preview").forEach(
        (preview) => {
          introductionFragments.forEach((fragment) => {
            assert.equal(
              textContent(preview.innerHTML).includes(fragment),
              false,
              `Expected ${relativePath} article previews not to include introduction copy.`,
            );
          });
        },
      );
    },
  );

  ["index.xml", "homilies/index.xml", "reflections/index.xml"].forEach(
    (relativePath) => {
      const feed = decodeHTML(readFileSync(join(BUILD_ROOT, relativePath), "utf8"));
      introductionFragments.forEach((fragment) => {
        assert.equal(
          feed.includes(fragment),
          false,
          `Expected ${relativePath} not to include archive introduction copy.`,
        );
      });
    },
  );
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
  const pageHeadings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(pageHeadings.length, 1, `Expected one page heading in ${relativePath}.`);
  assert.equal(textContent(pageHeadings[0][1]), "Page not found");
  assert.equal(
    elementsWithClass(html, "nav", "breadcrumbs").length,
    0,
    `Expected ${relativePath} not to repeat a breadcrumb above its recovery content.`,
  );

  const recoveryLinks = anchors(recoveryRegion.innerHTML).map((anchor) => ({
    name: anchor.name,
    url: new URL(anchor.href, pageURL).href,
  }));
  [
    ["Return home", "index.html"],
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

test("homily and reflection bylines agree with structured article authors", () => {
  [
    "homilies/2026/fifteenth_sunday_ordinary_time/index.html",
    "reflections/2026/catholic_response_fear/index.html",
  ].forEach((relativePath) => {
    const html = page(relativePath);
    const byline = elementWithClass(html, "span", "article-byline", relativePath);
    assertVisible(byline, `span.article-byline in ${relativePath}`);
    assert.equal(textContent(byline.html), "By Rev. Adam Royal");

    const bylineLinks = anchors(byline.innerHTML);
    assert.equal(
      bylineLinks.length,
      1,
      `Expected exactly one author link in the byline for ${relativePath}.`,
    );
    const authorLink = bylineLinks[0];
    assert.ok(
      (authorLink.attributes.get("rel") || "").split(/\s+/).includes("author"),
      `Expected the byline link in ${relativePath} to have rel=author.`,
    );

    const document = structuredData(html, relativePath);
    const article = nodeByType(document, "BlogPosting", relativePath);
    const person = nodeForReference(document, article.author, relativePath);
    const personTypes = Array.isArray(person["@type"])
      ? person["@type"]
      : [person["@type"]];
    assert.ok(
      personTypes.includes("Person"),
      `Expected the article author in ${relativePath} to reference a Person.`,
    );

    const structuredAuthorName = [person.honorificPrefix, person.name]
      .filter(Boolean)
      .join(" ");
    assert.equal(authorLink.name, structuredAuthorName);
    assert.equal(textContent(byline.html), `By ${structuredAuthorName}`);
    assert.equal(
      new URL(authorLink.href, generatedURL(relativePath)).href,
      person.url,
      `Expected the visible and structured author URLs to agree in ${relativePath}.`,
    );
  });
});

test("article bylines appear only on homily and reflection singles", () => {
  pages.forEach((html, relativePath) => {
    const expectedCount = articlePathParts(relativePath) ? 1 : 0;
    assert.equal(
      elementsWithClass(html, "span", "article-byline").length,
      expectedCount,
      `Expected ${expectedCount} article byline${expectedCount === 1 ? "" : "s"} in ${relativePath}.`,
    );
  });
});

test("structured readings render on homilies and opt-in reflections", () => {
  let reflectionsWithReadings = 0;
  let ordinaryReflections = 0;

  articles.forEach((article) => {
    const document = structuredData(article.html, article.relativePath);
    const posting = nodeByType(document, "BlogPosting", article.relativePath);
    const expected = posting.citation
      ? Array.isArray(posting.citation)
        ? posting.citation
        : [posting.citation]
      : [];
    assert.deepEqual(
      visibleReadings(article.html, article.relativePath),
      expected,
      `Expected visible and structured readings to agree in ${article.relativePath}.`,
    );

    if (article.section !== "reflections") {
      return;
    }
    if (expected.length > 0) {
      reflectionsWithReadings += 1;
    } else {
      ordinaryReflections += 1;
    }
  });

  assert.ok(
    reflectionsWithReadings > 0,
    "Expected at least one reflection to opt into structured readings.",
  );
  assert.ok(
    ordinaryReflections > 0,
    "Expected readings to remain optional for ordinary reflections.",
  );
  assert.deepEqual(
    visibleReadings(
      page("reflections/2024/widow_ministry_reflection/index.html"),
      "reflections/2024/widow_ministry_reflection/index.html",
    ),
    ["Gospel: Luke 7:11-17"],
  );
});

test("optional reflection readings stay out of previews and feeds", () => {
  const articlePath =
    "reflections/2024/widow_ministry_reflection/index.html";
  const articleURL = generatedURL(articlePath);
  const archivePath = "reflections/2024/index.html";
  const forbidden = ["homily-readings", "Gospel:", "Luke 7:11-17"];
  const previews = [...pages].flatMap(([relativePath, html]) =>
    elementsWithClass(html, "article", "post-preview")
      .filter((candidate) =>
        anchors(candidate.html).some(
          (anchor) =>
            new URL(anchor.href, generatedURL(relativePath)).href === articleURL,
        ),
      )
      .map((preview) => ({ preview, relativePath })),
  );
  assert.ok(previews.length > 0, `Expected a generated preview for ${articleURL}.`);

  previews.forEach(({ preview, relativePath }) => {
    forbidden.forEach((marker) => {
      assert.equal(
        preview.html.includes(marker),
        false,
        `Expected ${relativePath} not to expose ${marker} in the preview for ${articleURL}.`,
      );
    });
  });
  forbidden.forEach((marker) => {
    assert.equal(
      page(archivePath).includes(marker),
      false,
      `Expected ${archivePath} not to expose ${marker}.`,
    );
  });

  let feedSightings = 0;
  [...allFiles]
    .filter((relativePath) => relativePath.endsWith("index.xml"))
    .forEach((relativePath) => {
      const feed = readFileSync(join(BUILD_ROOT, relativePath), "utf8");
      [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)].forEach((match) => {
        const link = match[1].match(/<link>([\s\S]*?)<\/link>/i);
        assert.ok(link, `Expected every item in ${relativePath} to have a link.`);
        if (decodeHTML(link[1].trim()) !== articleURL) {
          return;
        }

        feedSightings += 1;
        const title = match[1].match(/<title>([\s\S]*?)<\/title>/i);
        assert.ok(title, `Expected ${articleURL} in ${relativePath} to have a title.`);
        assert.equal(decodeHTML(title[1].trim()), "Widow Ministry Reflection");
        const item = decodeHTML(match[1]);
        forbidden.forEach((marker) => {
          assert.equal(
            item.includes(marker),
            false,
            `Expected ${relativePath} not to expose ${marker} for ${articleURL}.`,
          );
        });
      });
    });

  assert.ok(
    feedSightings > 0,
    `Expected at least one feed item for ${articleURL}.`,
  );
});

test("every article exposes one primary heading that matches its title", () => {
  articles.forEach((article) => {
    const primaryHeadings = renderedHeadings(article.html).filter(
      ({ level }) => level === 1,
    );
    assert.equal(
      primaryHeadings.length,
      1,
      `Expected one primary H1 in ${article.relativePath}.`,
    );
    assertVisible(primaryHeadings[0], `primary H1 in ${article.relativePath}`);
    assert.equal(primaryHeadings[0].text, article.title);
  });
});

test("covered reflections render the intended H2 and H3 hierarchy", () => {
  const coveredHeadings = [];

  REFLECTION_HEADING_HIERARCHIES.forEach(
    ({ outputPath, title, headings: expectedHeadings }) => {
      const html = page(outputPath);
      const article = elementWithClass(html, "article", "blog-post", outputPath);
      const actualHeadings = renderedHeadings(article.innerHTML);
      const expected = expectedHeadings.map(({ level, renderedText }) => ({
        level,
        text: renderedText,
      }));
      const primaryHeadings = renderedHeadings(html).filter(
        ({ level }) => level === 1,
      );

      assert.equal(primaryHeadings[0].text, title);
      assert.deepEqual(
        actualHeadings.map(({ level, text }) => ({ level, text })),
        expected,
        `Unexpected rendered hierarchy in ${outputPath}.`,
      );
      coveredHeadings.push(...actualHeadings);
    },
  );

  assert.equal(coveredHeadings.length, 27);
  assert.equal(coveredHeadings.filter(({ level }) => level === 2).length, 23);
  assert.equal(coveredHeadings.filter(({ level }) => level === 3).length, 4);
});

test("Two Resurrections renders verified image descriptions and provenance", () => {
  const relativePath = "reflections/2025/two_paintings/index.html";
  const article = elementWithClass(
    page(relativePath),
    "article",
    "blog-post",
    relativePath,
  );
  const figures = [...article.innerHTML.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)]
    .map((match, index) => {
      const image = match[1].match(/<img\b[^>]*>/i);
      const caption = match[1].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
      assert.ok(image, `Expected figure ${index + 1} in ${relativePath} to contain an image.`);
      assert.ok(caption, `Expected figure ${index + 1} in ${relativePath} to contain a caption.`);
      return {
        alt: decodeHTML(attributes(image[0]).get("alt")),
        caption: textContent(caption[1]),
        links: anchors(caption[1]).map(({ href, name }) => ({ href, name })),
      };
    });

  assert.deepEqual(figures, [
    {
      alt: "The risen Christ in a red mantle raises a hand in blessing and holds a victory banner above four armored guards around a stone tomb",
      caption: "Hans Schäufelein, Der Auferstandene Christus (after 1508). Source: Lempertz, lot 1138, 2007.",
      links: [
        {
          href: "https://web.archive.org/web/20210422192854/https://www.lempertz.com/de/kataloge/lot/903-1/1138-hans-schaeufelein.html",
          name: "Lempertz, lot 1138, 2007.",
        },
      ],
    },
    {
      alt: "The risen Christ in a red mantle holds an American flag above modern armed guards beside a concrete tomb and city skyline",
      caption: "Contemporary Resurrection scene generated with GPT-4o in ChatGPT.",
      links: [],
    },
  ]);
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
        const targetArticle = articles.find(
          (candidate) => candidate.url === generatedURL(targetPath),
        );
        assert.ok(targetArticle, `Expected ${target.href} to resolve to a known article.`);
        assert.equal(
          anchor.name
            .replace(/^(?:←|&larr;)\s*/, "")
            .replace(/\s*(?:→|&rarr;)$/, ""),
          targetArticle.title,
          `Expected article-navigation text to use the current title for ${target.href}.`,
        );
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

test("renamed Ordinary Time canonicals replace retired URLs in discovery surfaces", () => {
  assert.equal(LEGACY_HOMILY_MIGRATIONS.length, 25);
  assert.match(
    readFileSync(DEPLOYMENT_CONFIG_PATH, "utf8"),
    /^\s*directory\s*=\s*["']\.\/public["']\s*$/m,
    "Expected Cloudflare Workers to consume Hugo's generated public directory.",
  );
  const migratedByURL = new Map();
  const retiredURLs = new Set();

  LEGACY_HOMILY_MIGRATIONS.forEach(({ year, oldSlug, newSlug, title }) => {
    const oldURL = new URL(`/homilies/${year}/${oldSlug}/`, BASE_URL).href;
    const newURL = new URL(`/homilies/${year}/${newSlug}/`, BASE_URL).href;
    const article = articles.find((candidate) => candidate.url === newURL);

    assert.ok(article, `Expected the canonical article ${newURL}.`);
    assert.equal(article.title, title);
    assert.equal(sitemapURLs.has(oldURL), false, `Expected the sitemap to retire ${oldURL}.`);
    assert.equal(sitemapURLs.has(newURL), true, `Expected the sitemap to include ${newURL}.`);
    migratedByURL.set(newURL, article);
    retiredURLs.add(oldURL);
  });

  assert.equal(migratedByURL.size, 25);
  assert.equal(retiredURLs.size, 25);
  const sightings = new Map([...migratedByURL.keys()].map((url) => [url, 0]));

  [...allFiles]
    .filter((relativePath) => relativePath.endsWith("index.xml"))
    .forEach((relativePath) => {
      const feed = readFileSync(join(BUILD_ROOT, relativePath), "utf8");
      [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)].forEach((match) => {
        const title = match[1].match(/<title>([\s\S]*?)<\/title>/i);
        const link = match[1].match(/<link>([\s\S]*?)<\/link>/i);
        assert.ok(title, `Expected every item in ${relativePath} to have a title.`);
        assert.ok(link, `Expected every item in ${relativePath} to have a link.`);
        const itemURL = decodeHTML(link[1].trim());
        assert.equal(
          retiredURLs.has(itemURL),
          false,
          `Expected ${relativePath} not to expose retired feed URL ${itemURL}.`,
        );
        const article = migratedByURL.get(itemURL);
        if (!article) {
          return;
        }
        const guid = match[1].match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i);
        assert.ok(guid, `Expected ${itemURL} in ${relativePath} to have a guid.`);
        assert.equal(
          decodeHTML(title[1].trim()),
          article.title,
          `Expected ${relativePath} to preserve ${itemURL} with its corrected title.`,
        );
        assert.equal(
          decodeHTML(guid[1].trim()),
          itemURL,
          `Expected ${relativePath} to use the canonical URL as the guid for ${itemURL}.`,
        );
        sightings.set(itemURL, sightings.get(itemURL) + 1);
      });
    });

  sightings.forEach((count, url) => {
    assert.ok(count > 0, `Expected at least one feed to retain ${url}.`);
  });
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

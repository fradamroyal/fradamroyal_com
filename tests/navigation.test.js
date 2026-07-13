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
const REQUIRED_YEAR_ARCHIVES = new Map([
  ["homilies", ["2024", "2025", "2026"]],
  ["reflections", ["2024", "2025"]],
]);

let allFiles;
let allHTMLPages;
let pages;
let pagesByURL;
let articles;
let hugoConfig;

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
  articles = [...pages]
    .filter(([relativePath]) => articlePathParts(relativePath))
    .map(([relativePath, html]) => {
      const [, section, year] = articlePathParts(relativePath);
      const document = structuredData(html, relativePath);
      const article = nodeByType(document, "BlogPosting", relativePath);
      return {
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

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
const TEMPORARY_ROOT = mkdtempSync(join(tmpdir(), "fradamroyal-canonical-links-"));
const BUILD_ROOT = join(TEMPORARY_ROOT, "public");
const BASE_URL = "https://fradamroyal.com/";
const ERROR_PAGE_PATH = "404.html";

let pages;

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return htmlFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

function isRedirectPage(html) {
  return /<meta\b[^>]*\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh)(?:\s|>)/i.test(html);
}

function attributes(element) {
  const result = new Map();
  const content = element.replace(/^<[^\s>]+/i, "").replace(/\s*>$/, "");
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    result.set(match[1].toLowerCase(), match[2] || match[3] || match[4] || "");
  }

  return result;
}

function robotsDirectives(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((meta) => (meta.get("name") || "").toLowerCase() === "robots")
    .flatMap((meta) =>
      (meta.get("content") || "")
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean),
    );
}

function canonicalLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((link) =>
      (link.get("rel") || "")
        .toLowerCase()
        .split(/\s+/)
        .includes("canonical"),
    );
}

function documentTitle(html) {
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  assert.equal(titles.length, 1, "Expected exactly one document title.");
  return titles[0][1].trim();
}

function visibleHeading(html) {
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(headings.length, 1, "Expected exactly one visible H1.");
  return headings[0][1].replace(/<[^>]+>/g, "").trim();
}

function structuredData(html) {
  const match = html.match(
    /<script\b[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/i,
  );
  assert.ok(match, "Expected one JSON-LD script.");
  return JSON.parse(match[1]);
}

function generatedURL(relativePath) {
  if (relativePath === "index.html") {
    return BASE_URL;
  }
  assert.match(relativePath, /\/index\.html$/);
  return new URL(`/${relativePath.slice(0, -"index.html".length)}`, BASE_URL).href;
}

function page(relativePath) {
  const result = pages.get(relativePath);
  assert.ok(result, `Expected Hugo to generate ${relativePath}.`);
  return result;
}

test.before(() => {
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

  pages = new Map(
    htmlFiles(BUILD_ROOT).flatMap((path) => {
      const relativePath = relative(BUILD_ROOT, path).split(sep).join("/");
      const html = readFileSync(path, "utf8");
      return isRedirectPage(html) ? [] : [[relativePath, html]];
    }),
  );
});

test.after(() => {
  rmSync(TEMPORARY_ROOT, { recursive: true, force: true });
});

test("the generated 404 page is noindex and has no canonical URL", () => {
  const html = page(ERROR_PAGE_PATH);
  assert.ok(
    robotsDirectives(html).includes("noindex"),
    `Expected ${ERROR_PAGE_PATH} to include a noindex robots directive.`,
  );
  assert.equal(
    canonicalLinks(html).length,
    0,
    `Expected ${ERROR_PAGE_PATH} not to expose a canonical URL.`,
  );
});

test("home and the main sections expose distinct, descriptive document titles", () => {
  const expectations = new Map([
    [
      "index.html",
      {
        title: "Catholic Homilies and Reflections | Fr. Adam Royal",
        heading: "Homilies & Thoughts",
      },
    ],
    [
      "homilies/index.html",
      { title: "Catholic Homilies | Fr. Adam Royal", heading: "Homilies" },
    ],
    [
      "reflections/index.html",
      { title: "Catholic Reflections | Fr. Adam Royal", heading: "Reflections" },
    ],
    [
      "tools/index.html",
      { title: "Catholic Scripture Tools | Fr. Adam Royal", heading: "Tools" },
    ],
  ]);

  expectations.forEach((expected, relativePath) => {
    const html = page(relativePath);
    assert.equal(documentTitle(html), expected.title);
    assert.equal(visibleHeading(html), expected.heading);
  });
});

test("recurring articles use year-specific titles without changing their visible H1s", () => {
  const expectedTitles = new Map([
    ["homilies/2025/pentecost/index.html", "Pentecost Homily (2025) | Fr. Adam Royal"],
    ["homilies/2026/pentecost/index.html", "Pentecost Homily (2026) | Fr. Adam Royal"],
    [
      "reflections/2024/advent_by_candlelight/index.html",
      "Advent by Candlelight (2024) | Fr. Adam Royal",
    ],
    [
      "reflections/2025/advent_by_candlelight/index.html",
      "Advent by Candlelight (2025) | Fr. Adam Royal",
    ],
  ]);

  expectedTitles.forEach((expectedTitle, relativePath) => {
    const html = page(relativePath);
    assert.equal(documentTitle(html), expectedTitle);
    assert.equal(
      visibleHeading(html),
      expectedTitle.startsWith("Pentecost") ? "Pentecost" : "Advent by Candlelight",
    );
  });
});

test("paginator depths identify their page number in the document title", () => {
  assert.equal(
    documentTitle(page("page/2/index.html")),
    "Catholic Homilies and Reflections, Page 2 | Fr. Adam Royal",
  );
  assert.equal(
    documentTitle(page("homilies/page/2/index.html")),
    "Catholic Homilies, Page 2 | Fr. Adam Royal",
  );
});

test("every generated indexable page has a unique document title", () => {
  const titlePaths = new Map();

  pages.forEach((html, relativePath) => {
    if (relativePath === ERROR_PAGE_PATH) {
      return;
    }
    const title = documentTitle(html);
    assert.match(title, / \| Fr\. Adam Royal$/, `Expected a branded title in ${relativePath}.`);
    const paths = titlePaths.get(title) || [];
    paths.push(relativePath);
    titlePaths.set(title, paths);
  });

  const duplicates = [...titlePaths]
    .filter(([, relativePaths]) => relativePaths.length > 1)
    .map(([title, relativePaths]) => `${title}: ${relativePaths.join(", ")}`);
  assert.deepEqual(duplicates, [], `Expected unique indexable titles.\n${duplicates.join("\n")}`);
});

test("every generated non-error HTML page is indexable with one clean self-canonical URL", () => {
  const indexablePages = [...pages].filter(([relativePath]) => relativePath !== ERROR_PAGE_PATH);
  assert.ok(indexablePages.length > 0, "Expected Hugo to generate indexable HTML pages.");

  indexablePages.forEach(([relativePath, html]) => {
    assert.equal(
      robotsDirectives(html).includes("noindex"),
      false,
      `Expected non-error page ${relativePath} to remain indexable.`,
    );
    const links = canonicalLinks(html);
    assert.equal(links.length, 1, `Expected one canonical link in ${relativePath}.`);

    const canonical = links[0];
    assert.deepEqual(
      [...canonical.keys()].sort(),
      ["href", "rel"],
      `Expected only rel and href attributes on the canonical link in ${relativePath}.`,
    );
    assert.equal(
      canonical.get("href"),
      generatedURL(relativePath),
      `Expected ${relativePath} to self-canonicalize.`,
    );
    assert.match(
      canonical.get("href"),
      /^https:\/\//,
      `Expected an absolute HTTPS canonical URL in ${relativePath}.`,
    );

    const document = structuredData(html);
    const webPage = document["@graph"].find((node) =>
      (Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]).some((type) =>
        ["AboutPage", "CollectionPage", "WebPage"].includes(type),
      ),
    );
    assert.ok(webPage, `Expected page-level structured data in ${relativePath}.`);
    assert.equal(
      webPage.url,
      canonical.get("href"),
      `Expected structured data to use the canonical URL in ${relativePath}.`,
    );
    assert.equal(
      webPage["@id"],
      `${canonical.get("href")}#webpage`,
      `Expected the WebPage identifier to use the canonical URL in ${relativePath}.`,
    );
  });
});

test("representative stable pages expose their exact URLs", () => {
  const expectedURLs = new Map([
    ["index.html", "https://fradamroyal.com/"],
    ["homilies/index.html", "https://fradamroyal.com/homilies/"],
    ["reflections/index.html", "https://fradamroyal.com/reflections/"],
    [
      "homilies/2026/fifteenth_sunday_ordinary_time/index.html",
      "https://fradamroyal.com/homilies/2026/fifteenth_sunday_ordinary_time/",
    ],
    [
      "reflections/2026/catholic_response_fear/index.html",
      "https://fradamroyal.com/reflections/2026/catholic_response_fear/",
    ],
  ]);

  expectedURLs.forEach((expectedURL, relativePath) => {
    const links = canonicalLinks(page(relativePath));
    assert.equal(links.length, 1, `Expected one canonical link in ${relativePath}.`);
    assert.equal(links[0].get("href"), expectedURL);
  });
});

test("every generated paginator depth exposes its exact URL", () => {
  const paginatedPaths = [...pages.keys()].filter((relativePath) =>
    /^(?:page|homilies\/page|reflections\/page)\/(?:[2-9]|[1-9]\d+)\/index\.html$/.test(
      relativePath,
    ),
  );

  assert.ok(paginatedPaths.length > 0, "Expected Hugo to generate pagination pages.");
  paginatedPaths.forEach((relativePath) => {
    const links = canonicalLinks(page(relativePath));
    assert.equal(links.length, 1, `Expected one canonical link in ${relativePath}.`);
    assert.equal(links[0].get("href"), generatedURL(relativePath));
  });
});

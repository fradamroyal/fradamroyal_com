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

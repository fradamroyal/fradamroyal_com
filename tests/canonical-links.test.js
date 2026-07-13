"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, relative, resolve, sep } = require("node:path");
const {
  LEGACY_HOMILY_MIGRATIONS,
} = require("./fixtures/legacy-homily-migrations.js");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const TEMPORARY_ROOT = mkdtempSync(join(tmpdir(), "fradamroyal-canonical-links-"));
const BUILD_ROOT = join(TEMPORARY_ROOT, "public");
const BASE_URL = "https://fradamroyal.com/";
const ERROR_PAGE_PATH = "404.html";
const REDIRECTS_PATH = "_redirects";

let pages;
let redirects;

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

function metaValues(html, attributeName, attributeValue) {
  const expectedValue = attributeValue.toLowerCase();
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter(
      (meta) => (meta.get(attributeName) || "").toLowerCase() === expectedValue,
    )
    .map((meta) => decodeHTML(meta.get("content") || ""));
}

function singleMetaValue(html, attributeName, attributeValue, relativePath) {
  const values = metaValues(html, attributeName, attributeValue);
  assert.equal(
    values.length,
    1,
    `Expected exactly one ${attributeValue} value in ${relativePath}.`,
  );
  assert.notEqual(values[0].trim(), "", `Expected ${attributeValue} to be nonblank.`);
  return values[0];
}

function iconLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((link) =>
      (link.get("rel") || "")
        .toLowerCase()
        .split(/\s+/)
        .includes("icon"),
    );
}

function socialMetadata(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((meta) =>
      [meta.get("property"), meta.get("name")].some((value) => {
        const normalized = (value || "").toLowerCase();
        return normalized.startsWith("og:") || normalized.startsWith("twitter:");
      }),
    );
}

function nodeTypes(node) {
  return Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
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

function metaDescription(html) {
  const descriptions = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((meta) => (meta.get("name") || "").toLowerCase() === "description");
  assert.equal(descriptions.length, 1, "Expected exactly one meta description.");
  const content = descriptions[0].get("content") || "";
  assert.notEqual(content.trim(), "", "Expected a nonblank meta description.");
  return content;
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

function structuredWebPage(html) {
  const document = structuredData(html);
  const webPage = document["@graph"].find(
    (node) => typeof node["@id"] === "string" && node["@id"].endsWith("#webpage"),
  );
  assert.ok(webPage, "Expected a page-level JSON-LD node.");
  return webPage;
}

function generatedURL(relativePath) {
  if (relativePath === "index.html") {
    return BASE_URL;
  }
  assert.match(relativePath, /\/index\.html$/);
  return new URL(`/${relativePath.slice(0, -"index.html".length)}`, BASE_URL).href;
}

function parseRedirects(source) {
  const rules = new Map();

  source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const fields = line.split(/\s+/);
      assert.equal(fields.length, 3, `Expected a source, destination, and status in ${line}.`);
      const [sourcePath, destinationPath, status] = fields;
      assert.equal(rules.has(sourcePath), false, `Duplicate redirect source ${sourcePath}.`);
      rules.set(sourcePath, { destinationPath, status: Number.parseInt(status, 10) });
    });

  return rules;
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
  redirects = parseRedirects(readFileSync(join(BUILD_ROOT, REDIRECTS_PATH), "utf8"));
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
  assert.equal(
    socialMetadata(html).length,
    0,
    `Expected ${ERROR_PAGE_PATH} not to expose social-preview metadata.`,
  );
});

test("every generated page explicitly links the published favicon", () => {
  const faviconPath = join(BUILD_ROOT, "favicon.ico");
  const favicon = statSync(faviconPath);
  assert.ok(favicon.isFile(), "Expected Hugo to publish favicon.ico as a file.");
  assert.ok(favicon.size > 0, "Expected the published favicon to be nonempty.");
  const faviconVersion = createHash("sha256")
    .update(readFileSync(faviconPath))
    .digest("hex")
    .slice(0, 12);

  pages.forEach((html, relativePath) => {
    const links = iconLinks(html);
    assert.equal(links.length, 1, `Expected one favicon link in ${relativePath}.`);
    assert.equal(
      links[0].get("type"),
      "image/x-icon",
      `Expected ${relativePath} to identify the favicon's media type.`,
    );
    assert.equal(
      links[0].get("sizes"),
      "16x16 32x32 48x48 64x64 128x128 256x256",
      `Expected ${relativePath} to advertise every embedded favicon size.`,
    );
    const pageURL =
      relativePath === ERROR_PAGE_PATH
        ? new URL("/404.html", BASE_URL).href
        : generatedURL(relativePath);
    const faviconURL = new URL(links[0].get("href"), pageURL);
    assert.equal(
      faviconURL.pathname,
      "/favicon.ico",
      `Expected ${relativePath} to discover the root favicon.`,
    );
    assert.equal(
      faviconURL.searchParams.get("v"),
      faviconVersion,
      `Expected ${relativePath} to cache-bust the favicon with its content digest.`,
    );
    assert.equal(
      [...faviconURL.searchParams].length,
      1,
      `Expected ${relativePath} to expose only the favicon version query.`,
    );
  });
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

test("priority pages expose distinct descriptions aligned with structured data", () => {
  const expectations = new Map([
    [
      "index.html",
      "Browse recent Catholic homilies and reflections from Rev. Adam Royal, collected to inspire and guide your faith.",
    ],
    [
      "about/index.html",
      "Learn about Fr. Adam Royal, pastor of St. Alphonsus in Crossville, including his conversion, education, priestly ministry, and approach to homilies, reflections, and Scripture tools.",
    ],
    [
      "homilies/index.html",
      "Browse Catholic homilies by Rev. Adam Royal, with recent entries and archives organized by year.",
    ],
    [
      "reflections/index.html",
      "Explore Catholic reflections by Rev. Adam Royal on Scripture and the life of faith, with recent writing and archives organized by year.",
    ],
    [
      "tools/index.html",
      "Explore practical tools for Scripture, study, and ministry, including a dated plan for reading the entire Bible.",
    ],
    [
      "tools/bible-reading-plan/index.html",
      "Create a dated plan for reading all 73 books of the Bible in canonical order or Fr. Adam’s preferred reading order, with CSV, Markdown, and PDF downloads.",
    ],
  ]);

  const descriptions = new Set();
  expectations.forEach((expectedDescription, relativePath) => {
    const html = page(relativePath);
    const description = metaDescription(html);
    assert.equal(description, expectedDescription);
    assert.equal(structuredWebPage(html).description, expectedDescription);
    descriptions.add(description);
  });

  assert.equal(descriptions.size, expectations.size);

  const plannerDocument = structuredData(page("tools/bible-reading-plan/index.html"));
  const application = plannerDocument["@graph"].find(
    (node) => node["@type"] === "WebApplication",
  );
  assert.ok(application, "Expected the Bible planner to expose a WebApplication.");
  assert.equal(application.description, expectations.get("tools/bible-reading-plan/index.html"));
});

test("older content keeps summary- and body-derived description fallbacks", () => {
  const siteFallback =
    "A collection of homilies and reflections to, hopefully, inspire and guide your faith.";
  const expectations = new Map([
    [
      "reflections/2025/advent_by_candlelight/index.html",
      "By candlelight, these four Advent reflections trace a path from wakefulness to repentance, from fragile faith to renewed trust. Beginning with Jesus’ warning to stay awake, they move through John’s call to bear fruit, Christ’s assurance that grace is truly at work, and the quiet courage of Joseph. Together they invite us to let God enter ordinary life, weakness, and uncertainty, so the light of Emmanuel can be born anew.",
    ],
    [
      "homilies/2026/fifteenth_sunday_ordinary_time/index.html",
      "The Lord’s parable and his stated reason for speaking in parables are mutually illuminating. Which is to say, the parable draws us into the logic of parables and reveals their purpose. A parable is not a mere story or a moral lesson. It is an invitation to step inside a symbolic world and meditate. Every object within the symbolic cosmos is polyvalent and saturated with meaning. Understanding, then, is not reducible to “figuring out the message,” as if one were solving a puzzle. Understanding is discovered through participation in the parable.",
    ],
  ]);

  expectations.forEach((expectedDescription, relativePath) => {
    const html = page(relativePath);
    const description = metaDescription(html);
    assert.equal(description, expectedDescription);
    assert.notEqual(description, siteFallback);
    assert.equal(structuredWebPage(html).description, description);

    const article = structuredData(html)["@graph"].find(
      (node) => node["@type"] === "BlogPosting",
    );
    assert.ok(article, `Expected ${relativePath} to expose a BlogPosting.`);
    assert.equal(article.description, description);
  });
});

test("the Bible planner keeps its card summary separate from its search description", () => {
  const summary =
    "Create a dated plan for reading the entire Bible in canonical order or Fr. Adam’s preferred reading order.";
  const description = metaDescription(page("tools/bible-reading-plan/index.html"));

  assert.notEqual(description, summary);
  assert.ok(
    page("tools/index.html").includes(
      `<p class=tool-card__description>${summary}</p>`,
    ),
    "Expected the Tools card to keep using the planner summary.",
  );

  const toolsRSS = readFileSync(join(BUILD_ROOT, "tools", "index.xml"), "utf8");
  const plannerItem = toolsRSS.match(
    /<item>[^]*?<link>https:\/\/fradamroyal\.com\/tools\/bible-reading-plan\/<\/link>[^]*?<\/item>/,
  );
  assert.ok(plannerItem, "Expected the Tools RSS feed to contain the Bible planner item.");
  assert.ok(
    plannerItem[0].includes(`<description>${summary}</description>`),
    "Expected the Tools RSS item to keep using the planner summary.",
  );
  assert.equal(plannerItem[0].includes(`<description>${description}</description>`), false);
});

test("project archetypes prompt authors for a search description", () => {
  ["archetypes/default.md", "archetypes/homilies.md"].forEach((relativePath) => {
    const source = readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8");
    assert.match(
      source,
      /^description = '' # Required before publication; use summary separately for card copy\.$/m,
      `Expected ${relativePath} to include the required description prompt.`,
    );
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

test("renamed legacy homilies use new canonicals and permanent one-to-one redirects", () => {
  assert.equal(LEGACY_HOMILY_MIGRATIONS.length, 25);
  assert.equal(redirects.size, 50);
  assert.doesNotMatch(
    page("index.html"),
    /<link\b[^>]*\btype=["']text\/redirects["'][^>]*>/i,
    "Expected the Cloudflare control file not to be advertised as alternate content.",
  );

  LEGACY_HOMILY_MIGRATIONS.forEach(({ year, oldSlug, newSlug, title }) => {
    const relativePath = `homilies/${year}/${newSlug}/index.html`;
    const oldRelativePath = `homilies/${year}/${oldSlug}/index.html`;
    const oldPath = `/homilies/${year}/${oldSlug}`;
    const oldDirectoryPath = `${oldPath}/`;
    const newPath = `/homilies/${year}/${newSlug}/`;
    const html = page(relativePath);
    const canonical = canonicalLinks(html);
    const article = structuredData(html)["@graph"].find((node) =>
      nodeTypes(node).includes("BlogPosting"),
    );
    const webPage = structuredWebPage(html);

    assert.equal(visibleHeading(html), title);
    assert.equal(
      documentTitle(html),
      `${title} Homily (${year}) | Fr. Adam Royal`,
    );
    assert.ok(article, `Expected BlogPosting data in ${relativePath}.`);
    assert.equal(article.headline, title);
    assert.equal(webPage.name, title);
    assert.equal(canonical.length, 1, `Expected one canonical URL in ${relativePath}.`);
    assert.equal(canonical[0].get("href"), generatedURL(relativePath));
    assert.equal(
      html.includes(new URL(`${oldPath}/`, BASE_URL).href),
      false,
      `Expected ${relativePath} not to expose its retired URL.`,
    );
    assert.equal(
      pages.has(oldRelativePath),
      false,
      `Expected ${oldRelativePath} not to remain a canonical page.`,
    );
    assert.equal(
      existsSync(join(BUILD_ROOT, oldRelativePath)),
      false,
      `Expected server redirects to replace a generated alias page at ${oldRelativePath}.`,
    );
    assert.deepEqual(
      redirects.get(oldPath),
      { destinationPath: newPath, status: 301 },
      `Expected a permanent one-to-one redirect from ${oldPath}.`,
    );
    assert.deepEqual(
      redirects.get(oldDirectoryPath),
      { destinationPath: newPath, status: 301 },
      `Expected a permanent one-to-one redirect from ${oldDirectoryPath}.`,
    );
    assert.equal(redirects.has(newPath), false);
    assert.equal(redirects.has(newPath.replace(/\/$/, "")), false);
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

test("social metadata reuses each page's resolved title, description, and canonical URL", () => {
  pages.forEach((html, relativePath) => {
    if (relativePath === ERROR_PAGE_PATH) {
      return;
    }

    const canonical = canonicalLinks(html);
    assert.equal(canonical.length, 1, `Expected one canonical link in ${relativePath}.`);
    const title = decodeHTML(documentTitle(html));
    const description = decodeHTML(metaDescription(html));
    const document = structuredData(html);
    const isArticle = document["@graph"].some((node) =>
      nodeTypes(node).includes("BlogPosting"),
    );

    assert.equal(singleMetaValue(html, "property", "og:title", relativePath), title);
    assert.equal(
      singleMetaValue(html, "property", "og:description", relativePath),
      description,
    );
    assert.equal(
      singleMetaValue(html, "property", "og:url", relativePath),
      canonical[0].get("href"),
    );
    assert.equal(
      singleMetaValue(html, "property", "og:type", relativePath),
      isArticle ? "article" : "website",
    );
    assert.equal(
      singleMetaValue(html, "property", "og:site_name", relativePath),
      "Homilies & Thoughts",
    );
    assert.equal(singleMetaValue(html, "name", "twitter:card", relativePath), "summary");
    assert.equal(singleMetaValue(html, "name", "twitter:title", relativePath), title);
    assert.equal(
      singleMetaValue(html, "name", "twitter:description", relativePath),
      description,
    );
  });
});

test("social titles preserve literal punctuation without double escaping", () => {
  const relativePath =
    "reflections/2024/night_of_recollection_prayer_work_penitence/index.html";
  const html = page(relativePath);
  const expectedTitle =
    "Night of Recollection - Prayer, Work, & Penitence (2024) | Fr. Adam Royal";

  assert.equal(decodeHTML(documentTitle(html)), expectedTitle);
  assert.equal(singleMetaValue(html, "property", "og:title", relativePath), expectedTitle);
  assert.equal(singleMetaValue(html, "name", "twitter:title", relativePath), expectedTitle);
  assert.equal(html.includes("&amp;amp;"), false);
});

test("only explicitly illustrated content exposes social-preview images", () => {
  const illustratedPath = "reflections/2025/two_paintings/index.html";
  const illustratedHTML = page(illustratedPath);
  const expectedImages = [
    "https://fradamroyal.com/reflections/2025/two_paintings/painting_1.jpeg",
    "https://fradamroyal.com/reflections/2025/two_paintings/painting_2.png",
  ];
  assert.deepEqual(metaValues(illustratedHTML, "property", "og:image"), expectedImages);
  assert.deepEqual(metaValues(illustratedHTML, "name", "twitter:image"), [expectedImages[0]]);

  const illustratedArticle = structuredData(illustratedHTML)["@graph"].find((node) =>
    nodeTypes(node).includes("BlogPosting"),
  );
  assert.ok(illustratedArticle, `Expected a BlogPosting in ${illustratedPath}.`);
  assert.deepEqual(illustratedArticle.image, expectedImages);

  pages.forEach((html, relativePath) => {
    if (relativePath === ERROR_PAGE_PATH || relativePath === illustratedPath) {
      return;
    }
    assert.deepEqual(
      metaValues(html, "property", "og:image"),
      [],
      `Expected no Open Graph image fallback in ${relativePath}.`,
    );
    assert.deepEqual(
      metaValues(html, "name", "twitter:image"),
      [],
      `Expected no Twitter image fallback in ${relativePath}.`,
    );
  });
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

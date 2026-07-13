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
const { join, relative, resolve } = require("node:path");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const TEMPORARY_ROOT = mkdtempSync(join(tmpdir(), "fradamroyal-structured-data-"));
const BUILD_ROOT = join(TEMPORARY_ROOT, "public");
const ERROR_PAGE_PATH = "404.html";

let pages;
let errorPageHTML;

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return htmlFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

function structuredDataScripts(html) {
  const scripts = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(html)) !== null) {
    const typeMatch = match[1].match(
      /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );
    const type = typeMatch && (typeMatch[1] || typeMatch[2] || typeMatch[3]);
    if (type && type.toLowerCase() === "application/ld+json") {
      scripts.push(match[2]);
    }
  }

  return scripts;
}

function isRedirectPage(html) {
  return /<meta\b[^>]*\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh)(?:\s|>)/i.test(html);
}

function page(relativePath) {
  const result = pages.get(relativePath);
  assert.ok(result, `Expected Hugo to generate ${relativePath}.`);
  return result;
}

function nodeTypes(node) {
  return Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
}

function nodeByType(document, type) {
  const result = document["@graph"].find((node) => nodeTypes(node).includes(type));
  assert.ok(result, `Expected ${document.__path} to contain a ${type} node.`);
  return result;
}

function nodeForReference(document, reference) {
  assert.deepEqual(
    Object.keys(reference),
    ["@id"],
    `Expected an @id-only reference in ${document.__path}.`,
  );
  const result = document["@graph"].find((node) => node["@id"] === reference["@id"]);
  assert.ok(result, `Expected ${reference["@id"]} to resolve within ${document.__path}.`);
  return result;
}

function assertReferenceType(document, source, property, expectedType) {
  assert.ok(source[property], `Expected ${source["@type"]}.${property} in ${document.__path}.`);
  const target = nodeForReference(document, source[property]);
  assert.ok(
    nodeTypes(target).includes(expectedType),
    `Expected ${source["@type"]}.${property} to reference ${expectedType}.`,
  );
}

function collectPureReferences(value, references = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPureReferences(entry, references));
  } else if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "@id") {
      references.push(value["@id"]);
    } else {
      Object.values(value).forEach((entry) => collectPureReferences(entry, references));
    }
  }
  return references;
}

function assertHttpsValues(value, propertyPath = "document") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertHttpsValues(entry, `${propertyPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  Object.entries(value).forEach(([key, entry]) => {
    const path = `${propertyPath}.${key}`;
    if (["@id", "url", "license", "sameAs", "contentUrl", "item", "image"].includes(key)) {
      const values = Array.isArray(entry) ? entry : [entry];
      values.forEach((url) => {
        assert.equal(typeof url, "string", `Expected ${path} to contain URL strings.`);
        assert.match(url, /^https:\/\//, `Expected ${path} to be an absolute HTTPS URL.`);
      });
    }
    assertHttpsValues(entry, path);
  });
}

function assertNoEmptyValues(value, propertyPath = "document") {
  if (Array.isArray(value)) {
    assert.notEqual(value.length, 0, `Expected ${propertyPath} to be omitted instead of empty.`);
    value.forEach((entry, index) => assertNoEmptyValues(entry, `${propertyPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    assert.notEqual(value, "", `Expected ${propertyPath} to be omitted instead of empty.`);
    assert.notEqual(value, null, `Expected ${propertyPath} to be omitted instead of null.`);
    return;
  }

  assert.notEqual(
    Object.keys(value).length,
    0,
    `Expected ${propertyPath} to be omitted instead of an empty object.`,
  );
  Object.entries(value).forEach(([key, entry]) =>
    assertNoEmptyValues(entry, `${propertyPath}.${key}`),
  );
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
      const relativePath = relative(BUILD_ROOT, path);
      const html = readFileSync(path, "utf8");
      const scripts = structuredDataScripts(html);
      if (isRedirectPage(html)) {
        assert.equal(
          scripts.length,
          0,
          `Expected redirect page ${relativePath} not to duplicate destination structured data.`,
        );
        return [];
      }
      if (relativePath === ERROR_PAGE_PATH) {
        errorPageHTML = html;
        return [];
      }
      assert.equal(
        scripts.length,
        1,
        `Expected exactly one application/ld+json script in ${relativePath}.`,
      );

      let document;
      assert.doesNotThrow(() => {
        document = JSON.parse(scripts[0]);
      }, `Expected valid JSON-LD in ${relativePath}.`);
      assert.ok(
        document && typeof document === "object" && !Array.isArray(document),
        `Expected the JSON-LD payload in ${relativePath} to be an object, not an encoded JSON string.`,
      );
      Object.defineProperty(document, "__path", { value: relativePath });
      return [[relativePath, document]];
    }),
  );
});

test.after(() => {
  rmSync(TEMPORARY_ROOT, { recursive: true, force: true });
});

test("the generated 404 page has no JSON-LD", () => {
  assert.equal(typeof errorPageHTML, "string", `Expected Hugo to generate ${ERROR_PAGE_PATH}.`);
  assert.equal(
    structuredDataScripts(errorPageHTML).length,
    0,
    `Expected ${ERROR_PAGE_PATH} not to expose structured data.`,
  );
});

test("every generated non-error HTML page has one valid, self-contained JSON-LD graph", () => {
  assert.ok(pages.size > 0, "Expected Hugo to generate non-error HTML pages.");

  pages.forEach((document, relativePath) => {
    assert.equal(document["@context"], "https://schema.org");
    assert.ok(Array.isArray(document["@graph"]), `Expected an @graph in ${relativePath}.`);
    assert.ok(document["@graph"].length > 0, `Expected graph nodes in ${relativePath}.`);

    const identifiers = document["@graph"].map((node) => node["@id"]);
    identifiers.forEach((identifier) => {
      assert.equal(typeof identifier, "string", `Expected every node in ${relativePath} to have @id.`);
    });
    assert.equal(
      new Set(identifiers).size,
      identifiers.length,
      `Expected unique graph-node @ids in ${relativePath}.`,
    );

    collectPureReferences(document["@graph"]).forEach((identifier) => {
      assert.ok(
        identifiers.includes(identifier),
        `Expected reference ${identifier} to resolve within ${relativePath}.`,
      );
    });

    document["@graph"].forEach((node) => {
      if (node.datePublished && node.dateModified) {
        assert.ok(
          Date.parse(node.dateModified) >= Date.parse(node.datePublished),
          `Expected dateModified not to precede datePublished in ${relativePath}.`,
        );
      }
    });

    assertHttpsValues(document, relativePath);
    assertNoEmptyValues(document, relativePath);
  });
});

test("the home page identifies the author, website, and collection", () => {
  const document = page("index.html");
  const person = nodeByType(document, "Person");
  const website = nodeByType(document, "WebSite");
  const collection = nodeByType(document, "CollectionPage");
  assert.equal(person.name, "Adam Royal");
  assert.equal(person.honorificPrefix, "Rev.");
  assert.equal(person.url, "https://fradamroyal.com/about/");
  assert.deepEqual(person.sameAs, [
    "https://etcatholic.org/2016/07/father-adam-royal-is-the-diocese-of-knoxvilles-51st-ordained-priest/",
  ]);
  assert.equal(website.name, "Homilies & Thoughts");
  assert.equal(
    website.description,
    "A collection of homilies and reflections to, hopefully, inspire and guide your faith.",
  );
  assert.equal(
    collection.description,
    "Browse recent Catholic homilies and reflections from Rev. Adam Royal, collected to inspire and guide your faith.",
  );
  assertReferenceType(document, collection, "isPartOf", "WebSite");
});

test("a homily page exposes an article with its four Scripture citations", () => {
  const document = page("homilies/2026/fifteenth_sunday_ordinary_time/index.html");
  const webPage = nodeByType(document, "WebPage");
  const article = nodeByType(document, "BlogPosting");
  nodeByType(document, "Person");
  nodeByType(document, "WebSite");
  nodeByType(document, "BreadcrumbList");

  assert.equal(article.headline, "Fifteenth Sunday in Ordinary Time");
  assert.equal(article.genre, "Homily");
  assert.equal(article.articleSection, "Homilies");
  assert.deepEqual(article.citation, [
    "First Reading: Isa 55:10–11",
    "Responsorial Psalm: Ps 65:10, 11, 12–13, 14",
    "Second Reading: Rom 8:18–23",
    "Gospel: Matt 13:1–23",
  ]);
  assertReferenceType(document, webPage, "mainEntity", "BlogPosting");
  assert.equal("image" in article, false);
  assert.equal("keywords" in article, false);
});

test("a reflection page uses reflection-specific article metadata", () => {
  const document = page("reflections/2026/catholic_response_fear/index.html");
  const webPage = nodeByType(document, "WebPage");
  const article = nodeByType(document, "BlogPosting");

  assert.equal(article.headline, "A Catholic Response to Fear in Our Community");
  assert.equal(article.genre, "Reflection");
  assert.equal(article.articleSection, "Reflections");
  assert.equal("citation" in article, false);
  assertReferenceType(document, webPage, "mainEntity", "BlogPosting");
});

test("an image-bearing reflection exposes its explicitly named page resources", () => {
  const document = page("reflections/2025/two_paintings/index.html");
  const article = nodeByType(document, "BlogPosting");

  assert.deepEqual(article.image, [
    "https://fradamroyal.com/reflections/2025/two_paintings/painting_1.jpeg",
    "https://fradamroyal.com/reflections/2025/two_paintings/painting_2.png",
  ]);
});

test("a section archive is represented as a collection page", () => {
  const document = page("homilies/index.html");
  const collection = nodeByType(document, "CollectionPage");
  nodeByType(document, "Person");
  nodeByType(document, "WebSite");
  nodeByType(document, "BreadcrumbList");

  assert.equal(collection.name, "Homilies");
  assertReferenceType(document, collection, "isPartOf", "WebSite");
});

test("the about page identifies itself as an AboutPage", () => {
  const document = page("about/index.html");
  const about = nodeByType(document, "AboutPage");
  const person = nodeByType(document, "Person");

  assert.equal(about.name, "About");
  assertReferenceType(document, about, "mainEntity", "Person");
  assert.equal(person.name, "Adam Royal");
});

test("the Bible planner page connects its WebPage to a browser application", () => {
  const document = page("tools/bible-reading-plan/index.html");
  const webPage = nodeByType(document, "WebPage");
  const application = nodeByType(document, "WebApplication");

  assert.equal(application.name, "Bible Reading Plan");
  assert.equal(application.applicationCategory, "EducationalApplication");
  assert.equal(application.operatingSystem, "Any");
  assertReferenceType(document, webPage, "mainEntity", "WebApplication");
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const HEADERS_PATH = join(REPOSITORY_ROOT, "static", "_headers");
const IMMUTABLE_CACHE_CONTROL =
  "Cache-Control: public, max-age=31536000, immutable";
const EXPECTED_PATTERNS = [
  "/css/site.*.css",
  "/js/bible-reading-plan.*.js",
  "/css/*.woff",
  "/css/*.woff2",
  "/css/*.ttf",
];

function headerRules(source) {
  return source
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#")),
    )
    .filter((block) => block.length > 0);
}

function matchesHeaderPattern(pattern, path) {
  const segments = pattern.split("*");
  assert.equal(segments.length, 2, `${pattern} must contain exactly one splat.`);
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escape(segments[0])}.*${escape(segments[1])}$`).test(
    path,
  );
}

test("fingerprinted assets receive a one-year immutable browser cache policy", () => {
  const rules = headerRules(readFileSync(HEADERS_PATH, "utf8"));

  assert.deepEqual(
    rules.map(([pattern]) => pattern),
    EXPECTED_PATTERNS,
  );
  for (const [pattern, ...headers] of rules) {
    assert.equal(
      (pattern.match(/\*/g) || []).length,
      1,
      `${pattern} must use the single splat supported by Workers Static Assets.`,
    );
    assert.deepEqual(headers, [IMMUTABLE_CACHE_CONTROL]);
  }
});

test("the immutable policy excludes mutable and authored asset URLs", () => {
  const source = readFileSync(HEADERS_PATH, "utf8");

  for (const unsafePattern of [
    "/css/*",
    "/js/*",
    "/*.jpg",
    "/*.jpeg",
    "/*.png",
    "/*.webp",
    "/*",
  ]) {
    assert.equal(
      source.split("\n").some((line) => line.trim() === unsafePattern),
      false,
      `${unsafePattern} would apply an immutable policy too broadly.`,
    );
  }
});

test("the patterns match fingerprinted output without matching unhashed bundles", () => {
  const patterns = headerRules(readFileSync(HEADERS_PATH, "utf8")).map(
    ([pattern]) => pattern,
  );
  const immutableAssets = [
    `/css/site.${"a".repeat(64)}.css`,
    `/js/bible-reading-plan.${"b".repeat(64)}.js`,
    "/css/Libertinus-regular-QCO4PQ33.woff2",
    "/css/LM-regular-OADBJPBU.woff",
    "/css/LM-regular-6IUDCRRB.ttf",
  ];
  const mutableAssets = [
    "/css/site.css",
    "/css/site.css.map",
    "/js/bible-reading-plan.js",
    "/js/bible-reading-plan.js.map",
    "/reflections/2025/two_paintings/painting_1.jpeg",
  ];

  for (const path of immutableAssets) {
    assert.equal(
      patterns.some((pattern) => matchesHeaderPattern(pattern, path)),
      true,
      `${path} should receive the immutable cache policy.`,
    );
  }
  for (const path of mutableAssets) {
    assert.equal(
      patterns.some((pattern) => matchesHeaderPattern(pattern, path)),
      false,
      `${path} should retain the default revalidation policy.`,
    );
  }
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const HEADERS_PATH = join(REPOSITORY_ROOT, "static", "_headers");
const IMMUTABLE_CACHE_CONTROL =
  "Cache-Control: public, max-age=31536000, immutable";
const GLOBAL_SECURITY_PATTERN = "/*";
const BASELINE_SECURITY_HEADERS = [
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: strict-origin-when-cross-origin",
  "Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=()",
];
const EXPECTED_CACHE_PATTERNS = [
  "/css/site.*.css",
  "/js/bible-reading-plan.*.js",
  "/css/*.woff",
  "/css/*.woff2",
  "/css/*.ttf",
  "/reflections/*.jpg",
  "/reflections/*.jpeg",
  "/reflections/*.png",
  "/reflections/*.webp",
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

function immutableHeaderRules(source) {
  return headerRules(source).filter(([, ...headers]) =>
    headers.includes(IMMUTABLE_CACHE_CONTROL),
  );
}

test("baseline security headers apply globally without enabling HSTS", () => {
  const source = readFileSync(HEADERS_PATH, "utf8");
  const securityRules = headerRules(source).filter(
    ([pattern]) => pattern === GLOBAL_SECURITY_PATTERN,
  );

  assert.deepEqual(securityRules, [
    [GLOBAL_SECURITY_PATTERN, ...BASELINE_SECURITY_HEADERS],
  ]);
  assert.doesNotMatch(source, /Strict-Transport-Security/i);
});

test("fingerprinted assets and reflection images receive an immutable policy", () => {
  const rules = immutableHeaderRules(readFileSync(HEADERS_PATH, "utf8"));

  assert.deepEqual(
    rules.map(([pattern]) => pattern),
    EXPECTED_CACHE_PATTERNS,
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

test("the immutable policy excludes broad and homily image patterns", () => {
  const patterns = immutableHeaderRules(
    readFileSync(HEADERS_PATH, "utf8"),
  ).map(([pattern]) => pattern);

  for (const unsafePattern of [
    "/css/*",
    "/js/*",
    "/*.jpg",
    "/*.jpeg",
    "/*.png",
    "/*.webp",
    "/homilies/*.jpg",
    "/homilies/*.jpeg",
    "/homilies/*.png",
    "/homilies/*.webp",
    "/*",
  ]) {
    assert.equal(
      patterns.includes(unsafePattern),
      false,
      `${unsafePattern} would apply an immutable policy too broadly.`,
    );
  }
});

test("the patterns match nested reflection images without matching other images", () => {
  const patterns = immutableHeaderRules(
    readFileSync(HEADERS_PATH, "utf8"),
  ).map(([pattern]) => pattern);
  const immutableAssets = [
    `/css/site.${"a".repeat(64)}.css`,
    `/js/bible-reading-plan.${"b".repeat(64)}.js`,
    "/css/Libertinus-regular-QCO4PQ33.woff2",
    "/css/LM-regular-OADBJPBU.woff",
    "/css/LM-regular-6IUDCRRB.ttf",
    "/reflections/2025/two_paintings/painting_1.jpeg",
    "/reflections/2025/two_paintings/painting_2.png",
    `/reflections/2025/two_paintings/painting_1_hu_${"c".repeat(32)}.webp`,
    "/reflections/2026/example/photo.jpg",
  ];
  const mutableAssets = [
    "/css/site.css",
    "/css/site.css.map",
    "/js/bible-reading-plan.js",
    "/js/bible-reading-plan.js.map",
    "/homilies/2026/example/photo.jpg",
    "/images/portrait.jpeg",
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

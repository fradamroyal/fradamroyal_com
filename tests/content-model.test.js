"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const MODEL_PATH = join(REPOSITORY_ROOT, "data", "content_model.json");
const TEMPORARY_CONTENT = mkdtempSync(join(tmpdir(), "fradamroyal-content-model-"));
const model = JSON.parse(readFileSync(MODEL_PATH, "utf8"));

function assertRegistry(registry, name) {
  assert.ok(registry && typeof registry === "object" && !Array.isArray(registry));
  const labels = new Set();

  Object.entries(registry).forEach(([identifier, entry]) => {
    assert.match(
      identifier,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `Expected ${name} identifier ${identifier} to use lowercase kebab-case.`,
    );
    assert.ok(entry && typeof entry === "object" && !Array.isArray(entry));
    assert.equal(typeof entry.label, "string");
    assert.notEqual(entry.label.trim(), "", `Expected ${identifier} to have a label.`);
    assert.equal(
      labels.has(entry.label),
      false,
      `Expected ${name} label ${entry.label} to be unique.`,
    );
    labels.add(entry.label);
  });
}

function generatedArchetype(kind, relativePath) {
  const creation = spawnSync(
    "hugo",
    [
      "new",
      "content",
      "--noBuildLock",
      "--contentDir",
      TEMPORARY_CONTENT,
      "--kind",
      kind,
      relativePath,
    ],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
    },
  );

  assert.equal(creation.error, undefined, creation.error && creation.error.message);
  assert.equal(
    creation.status,
    0,
    `Hugo failed to scaffold ${relativePath}.\n${creation.stdout || ""}\n${creation.stderr || ""}`,
  );
  return readFileSync(join(TEMPORARY_CONTENT, relativePath), "utf8");
}

function assignmentCount(source, field) {
  return [...source.matchAll(new RegExp(`^${field}\\s*=`, "gm"))].length;
}

function assertControlledPrompts(source, kind) {
  ["liturgical_season", "liturgical_occasion"].forEach((field) => {
    assert.equal(
      assignmentCount(source, field),
      1,
      `Expected one ${field} prompt in the ${kind} archetype.`,
    );
    assert.match(source, new RegExp(`^${field}\\s*=\\s*''$`, "m"));
  });

  [
    "categories",
    "tags",
    "series",
    "lectionary_cycle",
    "liturgical_year",
    "pastoral_themes",
    "scripture_books",
    "scripture_passages",
    "themes",
  ].forEach((field) => {
    assert.equal(
      assignmentCount(source, field),
      0,
      `Expected the ${kind} archetype not to scaffold ${field}.`,
    );
  });
}

test.after(() => {
  rmSync(TEMPORARY_CONTENT, { recursive: true, force: true });
});

test("the authored content model stays deliberately small", () => {
  assert.equal(model.version, 1);
  assert.deepEqual(Object.keys(model.fields).sort(), [
    "liturgical_occasion",
    "liturgical_season",
  ]);

  Object.values(model.fields).forEach((field) => {
    assert.equal(field.type, "string");
    assert.deepEqual(field.required_for, ["homilies"]);
    assert.deepEqual(field.optional_for, ["reflections"]);
    assert.ok(model[field.registry], `Expected registry ${field.registry} to exist.`);
  });
});

test("season and occasion registries use stable identifiers and labels", () => {
  assert.deepEqual(Object.keys(model.liturgical_seasons), [
    "advent",
    "christmas",
    "lent",
    "paschal-triduum",
    "easter",
    "ordinary-time",
  ]);
  assertRegistry(model.liturgical_seasons, "season");
  assertRegistry(model.liturgical_occasions, "occasion");

  assert.ok(model.liturgical_occasions["fourteenth-sunday-in-ordinary-time"]);
  assert.ok(model.liturgical_occasions["fifteenth-sunday-in-ordinary-time"]);
});

test("year and Scripture dimensions remain derived from canonical fields", () => {
  assert.deepEqual(model.derived_values, {
    calendar_year: { source: "date" },
    scripture_passages: { source: "readings[].citation" },
    scripture_books: { source: "readings[].citation" },
  });
});

test("hub policy cannot create thin or automatic collection pages", () => {
  const policy = model.hub_policy;
  assert.equal(policy.common.requires_manual_enablement, true);
  assert.equal(policy.common.requires_unique_title, true);
  assert.equal(policy.common.requires_description, true);
  assert.equal(policy.common.requires_introduction, true);
  assert.equal(policy.common.requires_section_navigation, true);
  assert.equal(policy.common.automatic_generation, false);

  assert.deepEqual(policy.liturgical_season, {
    minimum_published_articles: 6,
    minimum_distinct_years: 2,
  });
  assert.deepEqual(policy.liturgical_occasion, {
    minimum_published_articles: 3,
    minimum_distinct_years: 3,
  });
  assert.deepEqual(policy.scripture_book, {
    minimum_published_articles: 12,
    minimum_distinct_years: 3,
    source: "non-responsorial readings[].citation",
  });
  assert.deepEqual(policy.scripture_passage, {
    minimum_published_articles: 4,
    minimum_distinct_years: 3,
    source: "exact normalized non-responsorial readings[].citation",
  });
});

test("Hugo scaffolds controlled homily metadata without duplicate dimensions", () => {
  const source = generatedArchetype("homilies", "homilies/2099/model.md");
  assertControlledPrompts(source, "homily");
  assert.match(source, /^\[\[readings\]\]$/m);
});

test("Hugo scaffolds the same optional fields for reflections", () => {
  const source = generatedArchetype("reflections", "reflections/2099/model.md");
  assertControlledPrompts(source, "reflection");
  assert.doesNotMatch(source, /^\[\[readings\]\]$/m);
});

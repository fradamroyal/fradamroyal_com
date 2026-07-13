"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { extname, join, relative, resolve } = require("node:path");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const MODEL_PATH = join(REPOSITORY_ROOT, "data", "content_model.json");
const TEMPORARY_ROOT = mkdtempSync(join(tmpdir(), "fradamroyal-content-model-"));
const TEMPORARY_CONTENT = join(TEMPORARY_ROOT, "archetype-content");
const BUILD_ROOT = join(TEMPORARY_ROOT, "candidate-public");
const NEUTRAL_CONTENT = join(TEMPORARY_ROOT, "neutral-content");
const NEUTRAL_BUILD_ROOT = join(TEMPORARY_ROOT, "neutral-public");
mkdirSync(TEMPORARY_CONTENT, { recursive: true });
const model = JSON.parse(readFileSync(MODEL_PATH, "utf8"));
const EXCLUDED_AUTHORED_FIELDS = [
  "categories",
  "tags",
  "series",
  "lectionary_cycle",
  "liturgical_year",
  "pastoral_themes",
  "scripture_books",
  "scripture_passages",
  "themes",
];
const PILOT_HOMILIES = [
  {
    source: "content/homilies/2024/fourteenth_sunday_per_annum.md",
    output: "homilies/2024/fourteenth_sunday_per_annum/index.html",
    date: "2024-07-07",
    occasion: "fourteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2024/fifthteenth_sunday_per_annum.md",
    output: "homilies/2024/fifthteenth_sunday_per_annum/index.html",
    date: "2024-07-14",
    occasion: "fifteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2025/fourteenth_sunday_ordinary_time.md",
    output: "homilies/2025/fourteenth_sunday_ordinary_time/index.html",
    date: "2025-07-06",
    occasion: "fourteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2025/fifthteenth_sunday_ordinary_time.md",
    output: "homilies/2025/fifthteenth_sunday_ordinary_time/index.html",
    date: "2025-07-13",
    occasion: "fifteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2026/fourteenth_sunday_ordinary_time.md",
    output: "homilies/2026/fourteenth_sunday_ordinary_time/index.html",
    date: "2026-07-05",
    occasion: "fourteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2026/fifteenth_sunday_ordinary_time.md",
    output: "homilies/2026/fifteenth_sunday_ordinary_time/index.html",
    date: "2026-07-12",
    occasion: "fifteenth-sunday-in-ordinary-time",
  },
];

function outputFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return outputFiles(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

function buildSite(contentDir, destination, cacheDir) {
  const args = [
    "--gc",
    "--minify",
    "--noBuildLock",
    "--enableGitInfo=false",
    "--cacheDir",
    cacheDir,
    "--destination",
    destination,
  ];
  if (contentDir) {
    args.push("--contentDir", contentDir);
  }

  const build = spawnSync("hugo", args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
  assert.equal(build.error, undefined, build.error && build.error.message);
  assert.equal(
    build.status,
    0,
    `Hugo build failed.\n${build.stdout || ""}\n${build.stderr || ""}`,
  );
}

function outputDigests(directory) {
  return new Map(
    outputFiles(directory)
      .map((path) => [
        relative(directory, path),
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function removePilotMetadata() {
  let removedAssignments = 0;

  PILOT_HOMILIES.forEach(({ source }) => {
    const neutralPath = join(NEUTRAL_CONTENT, source.replace(/^content\//, ""));
    let content = readFileSync(neutralPath, "utf8");

    ["liturgical_season", "liturgical_occasion"].forEach((field) => {
      const pattern = new RegExp(`^${field}\\s*=.*(?:\\r?\\n)?`, "gm");
      const matches = content.match(pattern) || [];
      assert.equal(matches.length, 1, `Expected one ${field} assignment in ${source}.`);
      removedAssignments += matches.length;
      content = content.replace(pattern, "");
    });

    writeFileSync(neutralPath, content);
  });

  assert.equal(removedAssignments, PILOT_HOMILIES.length * 2);
}

function frontMatter(source, path) {
  const match = source.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+/);
  assert.ok(match, `Expected TOML front matter in ${path}.`);
  return match[1];
}

function stringAssignment(source, field, path) {
  const pattern = new RegExp(`^${field}\\s*=\\s*(['\"])(.*?)\\1\\s*$`, "gm");
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Expected one ${field} assignment in ${path}.`);
  assert.notEqual(matches[0][2].trim(), "", `Expected ${field} to be nonblank in ${path}.`);
  return matches[0][2];
}

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

  EXCLUDED_AUTHORED_FIELDS.forEach((field) => {
    assert.equal(
      assignmentCount(source, field),
      0,
      `Expected the ${kind} archetype not to scaffold ${field}.`,
    );
  });
}

test.before(() => {
  cpSync(join(REPOSITORY_ROOT, "content"), NEUTRAL_CONTENT, { recursive: true });
  removePilotMetadata();
  buildSite(undefined, BUILD_ROOT, join(TEMPORARY_ROOT, "candidate-cache"));
  buildSite(
    NEUTRAL_CONTENT,
    NEUTRAL_BUILD_ROOT,
    join(TEMPORARY_ROOT, "neutral-cache"),
  );
});

test.after(() => {
  rmSync(TEMPORARY_ROOT, { recursive: true, force: true });
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

test("the six source-verified pilot homilies use exact controlled values", () => {
  const occasionYears = new Map();

  PILOT_HOMILIES.forEach(({ source, date, occasion }) => {
    const content = readFileSync(join(REPOSITORY_ROOT, source), "utf8");
    const metadata = frontMatter(content, source);

    assert.match(metadata, new RegExp(`^date\\s*=\\s*${date}$`, "m"));
    assert.match(metadata, /^draft\s*=\s*false$/m);
    assert.equal(stringAssignment(metadata, "liturgical_season", source), "ordinary-time");
    assert.equal(stringAssignment(metadata, "liturgical_occasion", source), occasion);
    assert.ok(model.liturgical_seasons["ordinary-time"]);
    assert.ok(model.liturgical_occasions[occasion]);
    assert.equal([...metadata.matchAll(/^\[\[readings\]\]$/gm)].length, 4);
    assert.equal([...metadata.matchAll(/^citation\s*=\s*(['\"]).+?\1$/gm)].length, 4);

    const years = occasionYears.get(occasion) || new Set();
    years.add(date.slice(0, 4));
    occasionYears.set(occasion, years);

    EXCLUDED_AUTHORED_FIELDS.forEach((field) => {
      assert.equal(assignmentCount(metadata, field), 0, `Unexpected ${field} in ${source}.`);
    });
  });

  assert.equal(PILOT_HOMILIES.length, 6);
  [
    "fourteenth-sunday-in-ordinary-time",
    "fifteenth-sunday-in-ordinary-time",
  ].forEach((occasion) => {
    assert.equal(PILOT_HOMILIES.filter((page) => page.occasion === occasion).length, 3);
    assert.deepEqual([...occasionYears.get(occasion)].sort(), ["2024", "2025", "2026"]);
  });
});

test("all introduced homily metadata is complete and registered", () => {
  outputFiles(join(REPOSITORY_ROOT, "content", "homilies"))
    .filter((path) => extname(path) === ".md")
    .forEach((path) => {
      const source = readFileSync(path, "utf8");
      const metadata = frontMatter(source, relative(REPOSITORY_ROOT, path));
      const seasonCount = assignmentCount(metadata, "liturgical_season");
      const occasionCount = assignmentCount(metadata, "liturgical_occasion");
      if (seasonCount === 0 && occasionCount === 0) {
        return;
      }

      const sourcePath = relative(REPOSITORY_ROOT, path);
      assert.equal(seasonCount, 1, `Expected one liturgical_season in ${sourcePath}.`);
      assert.equal(occasionCount, 1, `Expected one liturgical_occasion in ${sourcePath}.`);
      const season = stringAssignment(metadata, "liturgical_season", sourcePath);
      const occasion = stringAssignment(metadata, "liturgical_occasion", sourcePath);
      assert.ok(model.liturgical_seasons[season], `Unregistered season ${season}.`);
      assert.ok(model.liturgical_occasions[occasion], `Unregistered occasion ${occasion}.`);
    });
});

test("pilot metadata is byte-neutral across the complete generated site", () => {
  const candidate = outputDigests(BUILD_ROOT);
  const neutral = outputDigests(NEUTRAL_BUILD_ROOT);
  assert.deepEqual([...candidate.keys()], [...neutral.keys()]);
  candidate.forEach((digest, path) => {
    assert.equal(digest, neutral.get(path), `Expected ${path} not to depend on pilot metadata.`);
  });
});

test("pilot metadata does not leak into pages, summaries, feeds, or hub URLs", () => {
  PILOT_HOMILIES.forEach(({ output }) => {
    assert.doesNotThrow(
      () => readFileSync(join(BUILD_ROOT, output), "utf8"),
      `Expected Hugo to generate ${output}.`,
    );
  });

  const forbiddenValues = [
    "liturgical_season",
    "liturgical_occasion",
    "ordinary-time",
    "fourteenth-sunday-in-ordinary-time",
    "fifteenth-sunday-in-ordinary-time",
  ];
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);

  outputFiles(BUILD_ROOT)
    .filter((path) => textExtensions.has(extname(path)))
    .forEach((path) => {
      const content = readFileSync(path, "utf8");
      const output = relative(BUILD_ROOT, path);
      [
        "ordinary-time",
        "fourteenth-sunday-in-ordinary-time",
        "fifteenth-sunday-in-ordinary-time",
      ].forEach((segment) => {
        assert.equal(output.includes(segment), false, `Unexpected generated hub path ${output}.`);
      });
      forbiddenValues.forEach((value) => {
        assert.equal(
          content.includes(value),
          false,
          `Expected controlled metadata value ${value} not to leak into ${output}.`,
        );
      });
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

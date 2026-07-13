"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  cpSync,
  existsSync,
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
const HOMILY_ROOT = join(REPOSITORY_ROOT, "content", "homilies");
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
const EXPECTED_SEASON_COUNTS = {
  advent: 9,
  christmas: 11,
  easter: 19,
  lent: 17,
  "ordinary-time": 68,
  "paschal-triduum": 6,
};
const NORMALIZATION_CASES = [
  {
    source: "content/homilies/2024/twelth_sunday_per_annum.md",
    date: "2024-06-23",
    season: "ordinary-time",
    occasion: "twelfth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2024/fifthteenth_sunday_per_annum.md",
    date: "2024-07-14",
    season: "ordinary-time",
    occasion: "fifteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2024/eighteenth_sundery_per_annum.md",
    date: "2024-08-04",
    season: "ordinary-time",
    occasion: "eighteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2024/immaculate_conception.md",
    date: "2024-12-09",
    season: "advent",
    occasion: "immaculate-conception-of-the-blessed-virgin-mary",
  },
  {
    source: "content/homilies/2025/assumption.md",
    date: "2025-08-14",
    season: "ordinary-time",
    occasion: "assumption-of-the-blessed-virgin-mary",
  },
  {
    source: "content/homilies/2025/assumption_day.md",
    date: "2025-08-15",
    season: "ordinary-time",
    occasion: "assumption-of-the-blessed-virgin-mary",
  },
  {
    source: "content/homilies/2025/christmas_midnight.md",
    date: "2025-12-25T00:00:01",
    season: "christmas",
    occasion: "nativity-of-the-lord",
  },
  {
    source: "content/homilies/2025/christmas_day.md",
    date: "2025-12-25T09:00:00",
    season: "christmas",
    occasion: "nativity-of-the-lord",
  },
  {
    source: "content/homilies/2025/holy_saturday.md",
    date: "2025-04-19",
    season: "paschal-triduum",
    occasion: "easter-vigil",
  },
  {
    source: "content/homilies/2025/second_sunday_easter.md",
    date: "2025-04-27",
    season: "easter",
    occasion: "second-sunday-of-easter",
  },
  {
    source: "content/homilies/2025/pentecost_vigil.md",
    date: "2025-06-07",
    season: "easter",
    occasion: "pentecost",
  },
  {
    source: "content/homilies/2025/pentecost.md",
    date: "2025-06-08",
    season: "easter",
    occasion: "pentecost",
  },
  {
    source: "content/homilies/2025/all_souls.md",
    date: "2025-11-02",
    season: "ordinary-time",
    occasion: "commemoration-of-all-the-faithful-departed",
  },
  {
    source: "content/homilies/2025/dedication_john_lateran.md",
    date: "2025-11-09",
    season: "ordinary-time",
    occasion: "dedication-of-the-lateran-basilica",
  },
  {
    source: "content/homilies/2026/called_by_name.md",
    date: "2026-01-17",
    season: "ordinary-time",
    occasion: "second-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2026/baptism_of_the_lord.md",
    date: "2026-01-11",
    season: "christmas",
    occasion: "baptism-of-the-lord",
  },
  {
    source: "content/homilies/2026/palm_sunday.md",
    date: "2026-03-29",
    season: "lent",
    occasion: "palm-sunday-of-the-passion-of-the-lord",
  },
  {
    source: "content/homilies/2026/joseph_the_worker.md",
    date: "2026-05-01",
    season: "easter",
    occasion: "saint-joseph-the-worker",
  },
  {
    source: "content/homilies/2026/trinity.md",
    date: "2026-05-31",
    season: "ordinary-time",
    occasion: "most-holy-trinity",
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

function homilySourcePaths() {
  return outputFiles(HOMILY_ROOT)
    .filter((path) => extname(path) === ".md" && !path.endsWith("_index.md"))
    .sort();
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

function removeHomilyMetadata() {
  let removedAssignments = 0;

  homilySourcePaths().forEach((sourcePath) => {
    const source = relative(REPOSITORY_ROOT, sourcePath);
    const neutralPath = join(
      NEUTRAL_CONTENT,
      relative(join(REPOSITORY_ROOT, "content"), sourcePath),
    );
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

  assert.equal(removedAssignments, homilySourcePaths().length * 2);
}

function frontMatter(source, path) {
  const match = source.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+/);
  assert.ok(match, `Expected TOML front matter in ${path}.`);
  return match[1];
}

function quotedStringAssignment(source, field, path) {
  const pattern = new RegExp(`^${field}\\s*=\\s*(['\"])(.*?)\\1\\s*$`, "gm");
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Expected one ${field} assignment in ${path}.`);
  return matches[0][2];
}

function stringAssignment(source, field, path) {
  const value = quotedStringAssignment(source, field, path);
  assert.notEqual(value.trim(), "", `Expected ${field} to be nonblank in ${path}.`);
  return value;
}

function scalarAssignment(source, field, path) {
  const pattern = new RegExp(`^${field}\\s*=\\s*(.*?)\\s*$`, "gm");
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Expected one ${field} assignment in ${path}.`);
  assert.notEqual(matches[0][1].trim(), "", `Expected ${field} to be nonblank in ${path}.`);
  return matches[0][1];
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
  removeHomilyMetadata();
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
  assert.ok(Object.keys(model.liturgical_occasions).length >= 74);
  assert.deepEqual(
    Object.keys(model.liturgical_occasions),
    Object.keys(model.liturgical_occasions).sort(),
  );

  [
    "easter-vigil",
    "immaculate-conception-of-the-blessed-virgin-mary",
    "nativity-of-the-lord",
    "saint-joseph-the-worker",
    "second-sunday-in-ordinary-time",
  ].forEach((occasion) => assert.ok(model.liturgical_occasions[occasion]));
});

test("year and Scripture dimensions remain derived from canonical fields", () => {
  assert.deepEqual(model.derived_values, {
    calendar_year: { source: "date" },
    scripture_passages: { source: "readings[].citation" },
    scripture_books: { source: "readings[].citation" },
  });
});

test("every published homily has complete registered metadata", () => {
  const paths = homilySourcePaths();
  const seasonCounts = {};
  const publishedOccasions = new Set();
  const registeredOccasionUsage = new Set();
  let publishedCount = 0;
  let readingCount = 0;

  assert.ok(paths.length >= 130);
  paths.forEach((path) => {
    const sourcePath = relative(REPOSITORY_ROOT, path);
    const metadata = frontMatter(readFileSync(path, "utf8"), sourcePath);
    const draft = scalarAssignment(metadata, "draft", sourcePath);
    const season = quotedStringAssignment(metadata, "liturgical_season", sourcePath);
    const occasion = quotedStringAssignment(metadata, "liturgical_occasion", sourcePath);

    stringAssignment(metadata, "title", sourcePath);
    scalarAssignment(metadata, "date", sourcePath);
    assert.match(draft, /^(?:true|false)$/, `Expected a Boolean draft value in ${sourcePath}.`);

    EXCLUDED_AUTHORED_FIELDS.forEach((field) => {
      assert.equal(assignmentCount(metadata, field), 0, `Unexpected ${field} in ${sourcePath}.`);
    });

    if (season.trim()) {
      assert.ok(model.liturgical_seasons[season], `Unregistered season ${season}.`);
    }
    if (occasion.trim()) {
      assert.ok(model.liturgical_occasions[occasion], `Unregistered occasion ${occasion}.`);
      registeredOccasionUsage.add(occasion);
    }
    if (draft === "true") {
      return;
    }

    const readings = [...metadata.matchAll(/^\[\[readings\]\]$/gm)].length;
    const citations = [...metadata.matchAll(/^citation\s*=\s*(['\"]).+?\1$/gm)].length;
    assert.notEqual(season.trim(), "", `Expected liturgical_season in ${sourcePath}.`);
    assert.notEqual(occasion.trim(), "", `Expected liturgical_occasion in ${sourcePath}.`);
    assert.ok(readings > 0, `Expected at least one reading in ${sourcePath}.`);
    assert.equal(citations, readings, `Expected one citation per reading in ${sourcePath}.`);

    publishedCount += 1;
    seasonCounts[season] = (seasonCounts[season] || 0) + 1;
    publishedOccasions.add(occasion);
    readingCount += readings;
  });

  assert.equal(publishedCount, 130);
  assert.deepEqual(seasonCounts, EXPECTED_SEASON_COUNTS);
  assert.equal(readingCount, 549);
  assert.equal(publishedOccasions.size, 74);
  assert.deepEqual(
    [...registeredOccasionUsage].sort(),
    Object.keys(model.liturgical_occasions),
  );
});

test("source-verified edge cases normalize to the intended liturgy", () => {
  NORMALIZATION_CASES.forEach(({ source, date, season, occasion }) => {
    const metadata = frontMatter(
      readFileSync(join(REPOSITORY_ROOT, source), "utf8"),
      source,
    );

    assert.equal(scalarAssignment(metadata, "date", source), date);
    assert.equal(stringAssignment(metadata, "liturgical_season", source), season);
    assert.equal(stringAssignment(metadata, "liturgical_occasion", source), occasion);
  });
});

test("corpus metadata is byte-neutral across the complete generated site", () => {
  const candidate = outputDigests(BUILD_ROOT);
  const neutral = outputDigests(NEUTRAL_BUILD_ROOT);
  assert.deepEqual([...candidate.keys()], [...neutral.keys()]);
  candidate.forEach((digest, path) => {
    assert.equal(digest, neutral.get(path), `Expected ${path} not to depend on corpus metadata.`);
  });
});

test("corpus metadata does not leak into pages, summaries, feeds, or hub URLs", () => {
  homilySourcePaths().forEach((sourcePath) => {
    const source = relative(REPOSITORY_ROOT, sourcePath);
    const metadata = frontMatter(readFileSync(sourcePath, "utf8"), source);
    if (scalarAssignment(metadata, "draft", source) === "true") {
      return;
    }

    const output = join(
      "homilies",
      relative(HOMILY_ROOT, sourcePath).replace(/\.md$/, "/index.html"),
    );
    assert.doesNotThrow(
      () => readFileSync(join(BUILD_ROOT, output), "utf8"),
      `Expected Hugo to generate ${output}.`,
    );
  });

  const forbiddenFields = ["liturgical_season", "liturgical_occasion"];
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);

  outputFiles(BUILD_ROOT)
    .filter((path) => textExtensions.has(extname(path)))
    .forEach((path) => {
      const content = readFileSync(path, "utf8");
      const output = relative(BUILD_ROOT, path);
      forbiddenFields.forEach((value) => {
        assert.equal(
          content.includes(value),
          false,
          `Expected controlled metadata field ${value} not to leak into ${output}.`,
        );
      });
    });

  [
    ...Object.keys(model.liturgical_seasons),
    ...Object.keys(model.liturgical_occasions),
  ].forEach((identifier) => {
    assert.equal(
      existsSync(join(BUILD_ROOT, "homilies", identifier)),
      false,
      `Unexpected generated hub path /homilies/${identifier}/.`,
    );
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
  const metadata = frontMatter(source, "generated homily");
  assertControlledPrompts(source, "homily");
  assert.equal(scalarAssignment(metadata, "draft", "generated homily"), "true");
  assert.equal(
    quotedStringAssignment(metadata, "liturgical_season", "generated homily"),
    "",
  );
  assert.equal(
    quotedStringAssignment(metadata, "liturgical_occasion", "generated homily"),
    "",
  );
  assert.match(source, /^\[\[readings\]\]$/m);
});

test("Hugo scaffolds the same optional fields for reflections", () => {
  const source = generatedArchetype("reflections", "reflections/2099/model.md");
  assertControlledPrompts(source, "reflection");
  assert.doesNotMatch(source, /^\[\[readings\]\]$/m);
});

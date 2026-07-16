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
const { dirname, extname, join, relative, resolve } = require("node:path");
const {
  LEGACY_HOMILY_MIGRATIONS,
} = require("./fixtures/legacy-homily-migrations.js");
const {
  REFLECTION_HEADING_HIERARCHIES,
} = require("./fixtures/reflection-heading-hierarchies.js");
const {
  INVALID_SCRIPTURE_READING_FIXTURES,
  VALID_SCRIPTURE_READING_FIXTURES,
} = require("./fixtures/scripture-readings.js");
const {
  ARTICLE_DESCRIPTION_BASELINE_PATHS,
  INVALID_ARTICLE_FRONT_MATTER_FIXTURES,
  VALID_ARTICLE_FRONT_MATTER_FIXTURES,
} = require("./fixtures/article-front-matter.js");

const REPOSITORY_ROOT = resolve(__dirname, "..");
const MODEL_PATH = join(REPOSITORY_ROOT, "data", "content_model.json");
const HOMILY_ROOT = join(REPOSITORY_ROOT, "content", "homilies");
const ARTICLE_ROOTS = [
  HOMILY_ROOT,
  join(REPOSITORY_ROOT, "content", "reflections"),
];
const SBL_ABBREVIATIONS_PATH = join(
  REPOSITORY_ROOT,
  "SBL_BIBLE_ABBREVIATIONS.md",
);
const ONE_CHAPTER_BOOKS = new Set([
  "Obad",
  "Phlm",
  "2 John",
  "3 John",
  "Jude",
]);
const TEMPORARY_ROOT = mkdtempSync(join(tmpdir(), "fradamroyal-content-model-"));
const TEMPORARY_CONTENT = join(TEMPORARY_ROOT, "archetype-content");
const BUILD_ROOT = join(TEMPORARY_ROOT, "candidate-public");
const NEUTRAL_CONTENT = join(TEMPORARY_ROOT, "neutral-content");
const NEUTRAL_BUILD_ROOT = join(TEMPORARY_ROOT, "neutral-public");
mkdirSync(TEMPORARY_CONTENT, { recursive: true });
const model = JSON.parse(readFileSync(MODEL_PATH, "utf8"));
const SBL_BOOK_ROWS = canonicalSblBookRows(
  readFileSync(SBL_ABBREVIATIONS_PATH, "utf8"),
);
const SBL_ABBREVIATIONS = new Set(
  SBL_BOOK_ROWS.flatMap((row) => row.abbreviations),
);
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
  "ordinary-time": 70,
  "paschal-triduum": 6,
};
const NORMALIZATION_CASES = [
  {
    source: "content/homilies/2024/twelfth_sunday_ordinary_time.md",
    date: "2024-06-23",
    season: "ordinary-time",
    occasion: "twelfth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2024/fifteenth_sunday_ordinary_time.md",
    date: "2024-07-14",
    season: "ordinary-time",
    occasion: "fifteenth-sunday-in-ordinary-time",
  },
  {
    source: "content/homilies/2024/eighteenth_sunday_ordinary_time.md",
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
    date: "2025-12-25T00:00:01-06:00",
    season: "christmas",
    occasion: "nativity-of-the-lord",
  },
  {
    source: "content/homilies/2025/christmas_day.md",
    date: "2025-12-25T09:00:00-06:00",
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

function articleSourcePaths() {
  return ARTICLE_ROOTS.flatMap((root) => outputFiles(root))
    .filter((path) => extname(path) === ".md" && !path.endsWith("_index.md"))
    .sort();
}

function canonicalSblBookRows(source) {
  return source.split(/\r?\n/).flatMap((line) => {
    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!row) {
      return [];
    }

    const abbreviations = [...row[2].matchAll(/`([^`]+)`/g)].map(
      (match) => match[1],
    );
    return abbreviations.length > 0
      ? [{ book: row[1].trim(), abbreviations }]
      : [];
  });
}

function readingRecordBlocks(metadata) {
  const headers = [
    ...metadata.matchAll(
      /^[ \t]*\[\[[ \t]*readings[ \t]*\]\][ \t]*(?:#.*)?$/gm,
    ),
  ];

  return headers.map((header, index) => {
    const contentStart = header.index + header[0].length;
    const remainder = metadata.slice(contentStart);
    const nextTable = remainder.search(
      /^[ \t]*(?:\[\[[^\]\r\n]+\]\]|\[[^\]\r\n]+\])[ \t]*(?:#.*)?$/m,
    );
    const contentEnd = nextTable === -1
      ? metadata.length
      : contentStart + nextTable;

    return {
      body: metadata.slice(contentStart, contentEnd),
      number: index + 1,
    };
  });
}

function quotedFieldValues(record, field) {
  const assignment = new RegExp(
    `^${field}[ \\t]*=[ \\t]*(['"])(.*?)\\1[ \\t]*(?:#.*)?$`,
    "gm",
  );
  return [...record.body.matchAll(assignment)].map((match) => match[2]);
}

function verseEndpointAscends(startVerse, startSuffix, endVerse, endSuffix) {
  const start = Number(startVerse);
  const end = Number(endVerse);
  if (end !== start) {
    return end > start;
  }
  if (!startSuffix || !endSuffix) {
    return true;
  }
  return endSuffix.at(-1) >= startSuffix[0];
}

function oneChapterRangesAscend(passage) {
  return passage.split(", ").every((segment) => {
    const range = segment.match(
      /^([1-9]\d*)([a-e]*)(?:–([1-9]\d*)([a-e]*))?$/,
    );
    return (
      !range[3] ||
      verseEndpointAscends(range[1], range[2], range[3], range[4])
    );
  });
}

function chapterRangesAscend(passage) {
  const wholeChapters = passage.match(/^([1-9]\d*)(?:–([1-9]\d*))?$/);
  if (wholeChapters) {
    return (
      !wholeChapters[2] ||
      Number(wholeChapters[2]) >= Number(wholeChapters[1])
    );
  }

  return passage.split("; ").every((group) => {
    const chapterAndSegments = group.match(/^([1-9]\d*):(.*)$/);
    const startChapter = Number(chapterAndSegments[1]);
    return chapterAndSegments[2].split(", ").every((segment) => {
      const range = segment.match(
        /^([1-9]\d*)([a-e]*)(?:–(?:([1-9]\d*):)?([1-9]\d*)([a-e]*))?$/,
      );
      if (!range[4]) {
        return true;
      }

      const endChapter = range[3] ? Number(range[3]) : startChapter;
      return (
        endChapter > startChapter ||
        (endChapter === startChapter &&
          verseEndpointAscends(range[1], range[2], range[4], range[5]))
      );
    });
  });
}

function sblRangesAscend(book, passage) {
  if (ONE_CHAPTER_BOOKS.has(book)) {
    return oneChapterRangesAscend(passage);
  }

  const estherAddition = passage.match(
    /^[A-F](?::([^ ]+))? \(([^)]+)\)$/,
  );
  if (book === "Esth" && estherAddition) {
    return (
      (!estherAddition[1] || oneChapterRangesAscend(estherAddition[1])) &&
      chapterRangesAscend(estherAddition[2])
    );
  }

  return chapterRangesAscend(passage);
}

function validSblPassage(book, passage) {
  const integer = "[1-9]\\d*";
  const suffix = [
    "(?:a(?:b(?:c(?:d(?:e)?)?)?)?",
    "b(?:c(?:d(?:e)?)?)?",
    "c(?:d(?:e)?)?",
    "d(?:e)?",
    "e)?",
  ].join("|");
  const verse = `${integer}${suffix}`;
  const verseRange = `${verse}(?:–${verse})?`;

  if (ONE_CHAPTER_BOOKS.has(book)) {
    return (
      new RegExp(`^${verseRange}(?:, ${verseRange})*$`).test(passage) &&
      sblRangesAscend(book, passage)
    );
  }

  const chapterVerse = `${integer}:${verse}`;
  const chapterRange = `${chapterVerse}(?:–(?:${verse}|${chapterVerse}))?`;
  const continuedVerseRange = `${verse}(?:–(?:${verse}|${chapterVerse}))?`;
  const chapterGroup = `${chapterRange}(?:, ${continuedVerseRange})*`;
  const chapterReference = `${integer}(?:–${integer})?`;
  const standardPassage = new RegExp(
    `^(?:${chapterReference}|${chapterGroup}(?:; ${chapterGroup})*)$`,
  ).test(passage);
  const estherAddition = new RegExp(
    `^[A-F](?::${verseRange})? \\(${chapterRange}\\)$`,
  ).test(passage);

  if (book === "Esth" && estherAddition) {
    return sblRangesAscend(book, passage);
  }
  if (!standardPassage || !sblRangesAscend(book, passage)) {
    return false;
  }

  const wholeChapters = passage.match(
    new RegExp(`^(${integer})(?:–(${integer}))?$`),
  );
  let spansMultipleChapters = Boolean(
    wholeChapters &&
      wholeChapters[2] &&
      wholeChapters[1] !== wholeChapters[2],
  );
  if (!wholeChapters) {
    const chapters = new Set();
    for (const match of passage.matchAll(
      new RegExp(`(?:^|; )(${integer}):|–(${integer}):`, "g"),
    )) {
      chapters.add(match[1] || match[2]);
    }
    spansMultipleChapters = chapters.size > 1;
  }

  if (book === "Pss") {
    return spansMultipleChapters;
  }
  if (book === "Ps") {
    return !spansMultipleChapters;
  }
  return true;
}

function validateReadingMetadata(metadata, sourcePath, allowedAbbreviations) {
  const errors = [];
  const abbreviationsByLength = [...allowedAbbreviations].sort(
    (left, right) => right.length - left.length || left.localeCompare(right),
  );
  const records = readingRecordBlocks(metadata).map((record) => {
    const context = `${sourcePath} reading ${record.number}`;
    const values = {};

    ["label", "citation"].forEach((field) => {
      const assignments = quotedFieldValues(record, field);
      if (assignments.length !== 1) {
        errors.push(`Expected ${context} to define exactly one ${field}.`);
        return;
      }

      values[field] = assignments[0];
      if (assignments[0].trim() === "") {
        errors.push(`Expected ${context} to have a nonblank ${field}.`);
      } else if (assignments[0] !== assignments[0].trim()) {
        errors.push(
          `Expected ${context} ${field} not to have surrounding whitespace.`,
        );
      }
    });

    const citation = values.citation;
    if (!citation || citation.trim() === "") {
      return { ...record, ...values };
    }

    const book = abbreviationsByLength.find(
      (abbreviation) => citation.startsWith(`${abbreviation} `),
    );
    if (!book) {
      if (allowedAbbreviations.has(citation)) {
        errors.push(`Expected ${context} to have a valid SBL passage locator.`);
      } else {
        errors.push(
          `Expected ${context} to start with a canonical SBL book abbreviation.`,
        );
      }
      return { ...record, ...values };
    }

    const passage = citation.slice(book.length + 1);
    if (!validSblPassage(book, passage)) {
      errors.push(`Expected ${context} to have a valid SBL passage locator.`);
    }

    return { ...record, ...values, book, passage };
  });

  return { errors, records };
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

function markdownBody(source, path) {
  const match = source.match(/^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+(?:\r?\n|$)/);
  assert.ok(match, `Expected TOML front matter in ${path}.`);
  return source.slice(match[0].length);
}

function markdownHeadings(source, path) {
  const headings = [];
  let fence;

  markdownBody(source, path)
    .split(/\r?\n/)
    .forEach((line) => {
      const fencedCode = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
      if (fencedCode) {
        const marker = fencedCode[1][0];
        const length = fencedCode[1].length;
        if (!fence) {
          fence = { marker, length };
        } else if (
          marker === fence.marker &&
          length >= fence.length &&
          fencedCode[2].trim() === ""
        ) {
          fence = undefined;
        }
        return;
      }
      if (fence) {
        return;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})[ \t]+(.+)$/);
      if (!heading) {
        return;
      }
      headings.push({
        level: heading[1].length,
        text: heading[2].replace(/[ \t]+#+[ \t]*$/, "").trimEnd(),
      });
    });

  return headings;
}

function quotedStringAssignment(source, field, path) {
  const pattern = new RegExp(`^${field}\\s*=\\s*(['\"])(.*?)\\1\\s*$`, "gm");
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Expected one ${field} assignment in ${path}.`);
  return matches[0][2];
}

function singleStringArrayAssignment(source, field, path) {
  const pattern = new RegExp(
    `^${field}\\s*=\\s*\\[\\s*(['"])(.*?)\\1\\s*\\]\\s*$`,
    "gm",
  );
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Expected one ${field} assignment in ${path}.`);
  return [matches[0][2]];
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

function assignmentValues(source, field) {
  const pattern = new RegExp(`^${field}[ \\t]*=[ \\t]*(.*?)[ \\t]*$`, "gm");
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function quotedTomlValue(value) {
  const match = value.match(/^(['"])(.*?)\1(?:[ \\t]+#.*)?$/);
  return match && match[2];
}

function validArticleDate(value) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2})))?$/,
  );
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12) {
    return false;
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  if (match[4] === undefined) {
    return true;
  }

  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  const validOffset =
    offsetHour < 14 || (offsetHour === 14 && offsetMinute === 0);
  return (
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetMinute <= 59 &&
    validOffset &&
    !(match[8] === "-" && offsetHour === 0 && offsetMinute === 0)
  );
}

function validateArticleFrontMatter(
  metadata,
  sourcePath,
  { allowBlankDescriptionPrompt = false, allowMissingDescription = false } = {},
) {
  const errors = [];
  const firstTable = metadata.search(/^[ \\t]*\[/m);
  const pageMetadata = firstTable === -1 ? metadata : metadata.slice(0, firstTable);

  const titleAssignments = assignmentValues(pageMetadata, "title");
  if (titleAssignments.length !== 1) {
    errors.push(`Expected ${sourcePath} to define exactly one title.`);
  } else {
    const title = quotedTomlValue(titleAssignments[0]);
    if (title === null) {
      errors.push(`Expected ${sourcePath} title to be a quoted TOML string.`);
    } else if (title.trim() === "") {
      errors.push(`Expected ${sourcePath} to have a nonblank title.`);
    } else if (title !== title.trim()) {
      errors.push(`Expected ${sourcePath} title not to have surrounding whitespace.`);
    }
  }

  const dateAssignments = assignmentValues(pageMetadata, "date");
  if (dateAssignments.length !== 1) {
    errors.push(`Expected ${sourcePath} to define exactly one date.`);
  } else {
    const date = dateAssignments[0].replace(/[ \\t]+#.*$/, "").trim();
    if (!validArticleDate(date)) {
      errors.push(
        `Expected ${sourcePath} to have a valid calendar date or offset-qualified RFC 3339 timestamp.`,
      );
    } else {
      const yearDirectory = sourcePath.match(
        /^content[\\/](?:homilies|reflections)[\\/](\d{4})[\\/]/,
      );
      const civilYear = date.slice(0, 4);
      if (yearDirectory && yearDirectory[1] !== civilYear) {
        errors.push(
          `Expected ${sourcePath} date civil year ${civilYear} to match its ${yearDirectory[1]} directory.`,
        );
      }
    }
  }

  const draftAssignments = assignmentValues(pageMetadata, "draft");
  if (draftAssignments.length !== 1) {
    errors.push(`Expected ${sourcePath} to define exactly one draft status.`);
  } else {
    const draft = draftAssignments[0].replace(/[ \\t]+#.*$/, "").trim();
    if (!/^(?:true|false)$/.test(draft)) {
      errors.push(`Expected ${sourcePath} to have a Boolean draft status.`);
    }
  }

  const descriptionAssignments = assignmentValues(pageMetadata, "description");
  let hasDescription = false;
  if (descriptionAssignments.length === 0 && allowMissingDescription) {
    return { errors, hasDescription };
  }
  if (descriptionAssignments.length !== 1) {
    errors.push(`Expected ${sourcePath} to define exactly one description.`);
    return { errors, hasDescription };
  }

  const description = quotedTomlValue(descriptionAssignments[0]);
  if (description === null) {
    errors.push(`Expected ${sourcePath} description to be a quoted TOML string.`);
  } else if (description.trim() === "") {
    if (!allowBlankDescriptionPrompt) {
      errors.push(`Expected ${sourcePath} to have a nonblank description.`);
    }
  } else if (description !== description.trim()) {
    errors.push(
      `Expected ${sourcePath} description not to have surrounding whitespace.`,
    );
  } else {
    hasDescription = true;
  }

  return { errors, hasDescription };
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

function assertArticleArchetypePrompts(source, kind) {
  const sourcePath = `generated ${kind}`;
  const metadata = frontMatter(source, sourcePath);
  const result = validateArticleFrontMatter(metadata, sourcePath, {
    allowBlankDescriptionPrompt: true,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.hasDescription, false);
  assert.match(
    source,
    /^description = '' # Required before publication; use summary separately for card copy\.$/m,
  );
  assert.equal(scalarAssignment(metadata, "draft", sourcePath), "true");
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

test("article front-matter lint covers every supported publication state", () => {
  VALID_ARTICLE_FRONT_MATTER_FIXTURES.forEach(({ name, metadata, sourcePath }) => {
    const result = validateArticleFrontMatter(
      metadata,
      sourcePath || `valid fixture ${name}`,
    );
    assert.deepEqual(result.errors, [], name);
    assert.equal(result.hasDescription, true, name);
  });
});

test("article front-matter lint rejects malformed required fields", () => {
  INVALID_ARTICLE_FRONT_MATTER_FIXTURES.forEach(
    ({ name, metadata, expectedError, sourcePath }) => {
      const result = validateArticleFrontMatter(
        metadata,
        sourcePath || `invalid fixture ${name}`,
      );
      assert.ok(
        result.errors.some((error) => error.includes(expectedError)),
        `${name}: expected an error containing ${JSON.stringify(expectedError)}; got ${JSON.stringify(result.errors)}.`,
      );
    },
  );
});

test("every authored article has valid required front matter", () => {
  assert.deepEqual(
    ARTICLE_DESCRIPTION_BASELINE_PATHS,
    [...ARTICLE_DESCRIPTION_BASELINE_PATHS].sort(),
    "Expected the legacy description baseline to remain sorted and reviewable.",
  );
  assert.equal(
    new Set(ARTICLE_DESCRIPTION_BASELINE_PATHS).size,
    ARTICLE_DESCRIPTION_BASELINE_PATHS.length,
    "Expected every legacy description exception to be unique.",
  );

  const baseline = new Set(ARTICLE_DESCRIPTION_BASELINE_PATHS);
  const missingDescriptions = [];
  articleSourcePaths().forEach((path) => {
    const sourcePath = relative(REPOSITORY_ROOT, path);
    const metadata = frontMatter(readFileSync(path, "utf8"), sourcePath);
    const result = validateArticleFrontMatter(metadata, sourcePath, {
      allowMissingDescription: baseline.has(sourcePath),
    });

    assert.deepEqual(result.errors, [], sourcePath);
    if (!result.hasDescription) {
      missingDescriptions.push(sourcePath);
    }
  });

  assert.deepEqual(
    missingDescriptions,
    ARTICLE_DESCRIPTION_BASELINE_PATHS,
    "Expected the legacy description baseline to match the current omissions exactly; remove stale exceptions after backfill and do not add new articles without descriptions.",
  );
});

test("Scripture lint derives every abbreviation from the canonical SBL reference", () => {
  assert.equal(SBL_BOOK_ROWS.length, 73);
  assert.equal(SBL_ABBREVIATIONS.size, 74);
  assert.equal(
    SBL_BOOK_ROWS.flatMap((row) => row.abbreviations).length,
    SBL_ABBREVIATIONS.size,
    "Expected every canonical SBL abbreviation to be unique.",
  );
  assert.deepEqual(
    SBL_BOOK_ROWS.find((row) => row.book === "Psalms").abbreviations,
    ["Ps", "Pss"],
  );
  ONE_CHAPTER_BOOKS.forEach((abbreviation) =>
    assert.ok(SBL_ABBREVIATIONS.has(abbreviation)),
  );
});

test("Scripture lint accepts the site's supported SBL citation forms", () => {
  VALID_SCRIPTURE_READING_FIXTURES.forEach(({ name, metadata }) => {
    const result = validateReadingMetadata(
      metadata,
      `valid fixture ${name}`,
      SBL_ABBREVIATIONS,
    );
    assert.deepEqual(result.errors, [], name);
    assert.equal(result.records.length, 1, name);
  });
});

test("Scripture lint rejects incomplete records and malformed citations", () => {
  INVALID_SCRIPTURE_READING_FIXTURES.forEach(
    ({ name, metadata, expectedError }) => {
      const result = validateReadingMetadata(
        metadata,
        `invalid fixture ${name}`,
        SBL_ABBREVIATIONS,
      );
      assert.ok(
        result.errors.some((error) => error.includes(expectedError)),
        `${name}: expected an error containing ${JSON.stringify(expectedError)}; got ${JSON.stringify(result.errors)}.`,
      );
    },
  );
});

test("every authored reading record is complete and uses an SBL citation", () => {
  const recordCounts = new Set();
  const labels = new Set();
  let sourcesWithReadings = 0;
  let totalRecords = 0;

  articleSourcePaths().forEach((path) => {
    const sourcePath = relative(REPOSITORY_ROOT, path);
    const metadata = frontMatter(readFileSync(path, "utf8"), sourcePath);
    const result = validateReadingMetadata(
      metadata,
      sourcePath,
      SBL_ABBREVIATIONS,
    );

    assert.deepEqual(result.errors, [], sourcePath);
    if (result.records.length === 0) {
      return;
    }

    sourcesWithReadings += 1;
    totalRecords += result.records.length;
    recordCounts.add(result.records.length);
    result.records.forEach((record) => labels.add(record.label));
  });

  assert.equal(sourcesWithReadings, 133);
  assert.equal(totalRecords, 556);
  [1, 3, 4, 5, 8, 17].forEach((count) => assert.ok(recordCounts.has(count)));
  [
    "Responsorial Psalm",
    "Third Responsorial Canticle",
    "Second Scrutiny Responsorial Psalm",
    "Psalm after Seventh Reading",
    "Year C Responsorial Psalm",
  ].forEach((label) => assert.ok(labels.has(label)));
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

    const readings = readingRecordBlocks(metadata).length;
    assert.notEqual(season.trim(), "", `Expected liturgical_season in ${sourcePath}.`);
    assert.notEqual(occasion.trim(), "", `Expected liturgical_occasion in ${sourcePath}.`);
    assert.ok(readings > 0, `Expected at least one reading in ${sourcePath}.`);

    publishedCount += 1;
    seasonCounts[season] = (seasonCounts[season] || 0) + 1;
    publishedOccasions.add(occasion);
    readingCount += readings;
  });

  assert.equal(publishedCount, 132);
  assert.deepEqual(seasonCounts, EXPECTED_SEASON_COUNTS);
  assert.equal(readingCount, 555);
  assert.equal(publishedOccasions.size, 76);
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

test("legacy Ordinary Time sources use canonical filenames and one-to-one aliases", () => {
  assert.equal(LEGACY_HOMILY_MIGRATIONS.length, 25);
  const expectedSources = new Set();
  const expectedAliases = new Set();

  LEGACY_HOMILY_MIGRATIONS.forEach(
    ({ year, oldSlug, newSlug, title: expectedTitle }) => {
      const oldSource = `content/homilies/${year}/${oldSlug}.md`;
      const source = `content/homilies/${year}/${newSlug}.md`;
      const alias = `/homilies/${year}/${oldSlug}/`;
      const sourcePath = join(REPOSITORY_ROOT, source);

      assert.equal(
        existsSync(join(REPOSITORY_ROOT, oldSource)),
        false,
        `Expected the legacy source path ${oldSource} to be retired.`,
      );
      assert.equal(
        existsSync(sourcePath),
        true,
        `Expected the canonical source path ${source} to exist.`,
      );

      const metadata = frontMatter(readFileSync(sourcePath, "utf8"), source);
      const season = stringAssignment(metadata, "liturgical_season", source);
      const occasion = stringAssignment(metadata, "liturgical_occasion", source);
      const title = stringAssignment(metadata, "title", source);
      const registeredOccasion = model.liturgical_occasions[occasion];

      assert.equal(season, "ordinary-time", `Expected Ordinary Time metadata in ${source}.`);
      assert.ok(registeredOccasion, `Expected ${occasion} to be a registered occasion.`);
      assert.equal(title, expectedTitle, `Expected the corrected title in ${source}.`);
      assert.equal(
        title,
        registeredOccasion.label,
        `Expected the display title in ${source} to match its registered occasion label.`,
      );
      assert.deepEqual(
        singleStringArrayAssignment(metadata, "aliases", source),
        [alias],
        `Expected ${source} to redirect only its former URL.`,
      );
      expectedSources.add(source);
      expectedAliases.add(alias);
    },
  );

  assert.equal(expectedSources.size, 25);
  assert.equal(expectedAliases.size, 25);
  const aliasedSources = homilySourcePaths()
    .map((path) => relative(REPOSITORY_ROOT, path))
    .filter((source) => {
      const contents = readFileSync(join(REPOSITORY_ROOT, source), "utf8");
      return /^aliases\s*=/m.test(frontMatter(contents, source));
    });
  assert.deepEqual(new Set(aliasedSources), expectedSources);
});

test("article sources use a valid hierarchy without body-level H1s", () => {
  const articleSources = ["homilies", "reflections"]
    .flatMap((section) =>
      outputFiles(join(REPOSITORY_ROOT, "content", section)),
    )
    .filter((path) => path.endsWith(".md") && !path.endsWith("_index.md"));

  articleSources.forEach((sourcePath) => {
    const source = relative(REPOSITORY_ROOT, sourcePath);
    const headings = markdownHeadings(readFileSync(sourcePath, "utf8"), source);
    let previousLevel = 1;

    headings.forEach((heading) => {
      assert.notEqual(
        heading.level,
        1,
        `Expected the template title to remain the only H1 for ${source}.`,
      );
      assert.ok(
        heading.level <= previousLevel + 1,
        `Expected ${source} not to skip from H${previousLevel} to H${heading.level}.`,
      );
      previousLevel = heading.level;
    });
  });

  assert.equal(REFLECTION_HEADING_HIERARCHIES.length, 4);
  const coveredHeadings = [];
  REFLECTION_HEADING_HIERARCHIES.forEach(({ sourcePath, headings }) => {
    const actual = markdownHeadings(
      readFileSync(join(REPOSITORY_ROOT, sourcePath), "utf8"),
      sourcePath,
    );
    const expected = headings.map(({ level, sourceText }) => ({
      level,
      text: sourceText,
    }));
    assert.deepEqual(actual, expected, `Unexpected source hierarchy in ${sourcePath}.`);
    coveredHeadings.push(...actual);
  });

  assert.equal(coveredHeadings.length, 27);
  assert.equal(coveredHeadings.filter(({ level }) => level === 2).length, 23);
  assert.equal(coveredHeadings.filter(({ level }) => level === 3).length, 4);
});

test("Two Resurrections exposes verified image facts without changing its assets", () => {
  const sourcePath = "content/reflections/2025/two_paintings/index.md";
  const absoluteSourcePath = join(REPOSITORY_ROOT, sourcePath);
  const bundlePath = dirname(absoluteSourcePath);
  const source = readFileSync(absoluteSourcePath, "utf8");
  const figures = [...markdownBody(source, sourcePath).matchAll(/^\{\{< figure .* >\}\}$/gm)]
    .map((match) => match[0]);

  assert.deepEqual(figures, [
    '{{< figure src="painting_1.jpeg" alt="The risen Christ in a red mantle raises a hand in blessing and holds a victory banner above four armored guards around a stone tomb" caption="Attributed to Hans Schäufelein, *Der Auferstandene Christus* (after 1508). Sources: [Lempertz, lot 1138, 2007.](https://web.archive.org/web/20210422192854/https://www.lempertz.com/de/kataloge/lot/903-1/1138-hans-schaeufelein.html) [Christie\'s, lot 7.](https://www.christies.com/en/lot/lot-5309506)" >}}',
    '{{< figure src="painting_2.png" alt="The risen Christ in a red mantle holds an American flag above modern armed guards beside a concrete tomb and city skyline" caption="Contemporary Resurrection scene generated with GPT-4o in ChatGPT." >}}',
  ]);

  const expectedDigests = new Map([
    ["painting_1.jpeg", "3bd8a4390f3a561a6d6aae908d96fe5d1887faf89cdf548f10bd3831f135011b"],
    ["painting_2.png", "cec72d92ef5d65abaac45466d4e951ea750db8bbdacf28b3be61f3bb155bb049"],
  ]);
  expectedDigests.forEach((expectedDigest, filename) => {
    const image = readFileSync(join(bundlePath, filename));
    assert.equal(createHash("sha256").update(image).digest("hex"), expectedDigest);
  });

  const contemporaryImage = readFileSync(
    join(bundlePath, "painting_2.png"),
  );
  [
    "c2pa.actions.v2",
    "c2pa.created",
    "GPT-4o",
    "ChatGPT",
    "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
  ].forEach((marker) => {
    assert.ok(
      contemporaryImage.includes(Buffer.from(marker)),
      `Expected painting_2.png Content Credentials to include ${marker}.`,
    );
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
  assertArticleArchetypePrompts(source, "homily");
  assertControlledPrompts(source, "homily");
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
  assertArticleArchetypePrompts(source, "reflection");
  assertControlledPrompts(source, "reflection");
  assert.doesNotMatch(source, /^\[\[readings\]\]$/m);
});

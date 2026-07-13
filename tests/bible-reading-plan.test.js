"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOOKS,
  CANON_UNITS,
  CANON_UNIT_COUNT,
  MAX_DAYS,
  PLAN_ORDERS,
  PREFERRED_TRACKS,
  PREVIEW_DAY_COUNT,
  parseCivilDate,
  formatCivilDate,
  addCivilDays,
  inclusiveDayCount,
  partitionCanon,
  getVerseTracks,
  getSenseTracks,
  partitionPreferred,
  maxDaysForOrder,
  formatCitations,
  formatVerseCitations,
  buildPlan,
  previewPlan,
} = require("../assets/js/bible-reading-plan.js");

const EXPECTED_BOOKS = [
  ["Genesis", "Gen"],
  ["Exodus", "Exod"],
  ["Leviticus", "Lev"],
  ["Numbers", "Num"],
  ["Deuteronomy", "Deut"],
  ["Joshua", "Josh"],
  ["Judges", "Judg"],
  ["Ruth", "Ruth"],
  ["1 Samuel", "1 Sam"],
  ["2 Samuel", "2 Sam"],
  ["1 Kings", "1 Kgs"],
  ["2 Kings", "2 Kgs"],
  ["1 Chronicles", "1 Chr"],
  ["2 Chronicles", "2 Chr"],
  ["Ezra", "Ezra"],
  ["Nehemiah", "Neh"],
  ["Tobit", "Tob"],
  ["Judith", "Jdt"],
  ["Esther", "Esth"],
  ["1 Maccabees", "1 Macc"],
  ["2 Maccabees", "2 Macc"],
  ["Job", "Job"],
  ["Psalms", "Ps"],
  ["Proverbs", "Prov"],
  ["Ecclesiastes", "Eccl"],
  ["Song of Songs", "Song"],
  ["Wisdom of Solomon", "Wis"],
  ["Sirach", "Sir"],
  ["Isaiah", "Isa"],
  ["Jeremiah", "Jer"],
  ["Lamentations", "Lam"],
  ["Baruch", "Bar"],
  ["Ezekiel", "Ezek"],
  ["Daniel", "Dan"],
  ["Hosea", "Hos"],
  ["Joel", "Joel"],
  ["Amos", "Amos"],
  ["Obadiah", "Obad"],
  ["Jonah", "Jonah"],
  ["Micah", "Mic"],
  ["Nahum", "Nah"],
  ["Habakkuk", "Hab"],
  ["Zephaniah", "Zeph"],
  ["Haggai", "Hag"],
  ["Zechariah", "Zech"],
  ["Malachi", "Mal"],
  ["Matthew", "Matt"],
  ["Mark", "Mark"],
  ["Luke", "Luke"],
  ["John", "John"],
  ["Acts of the Apostles", "Acts"],
  ["Romans", "Rom"],
  ["1 Corinthians", "1 Cor"],
  ["2 Corinthians", "2 Cor"],
  ["Galatians", "Gal"],
  ["Ephesians", "Eph"],
  ["Philippians", "Phil"],
  ["Colossians", "Col"],
  ["1 Thessalonians", "1 Thess"],
  ["2 Thessalonians", "2 Thess"],
  ["1 Timothy", "1 Tim"],
  ["2 Timothy", "2 Tim"],
  ["Titus", "Titus"],
  ["Philemon", "Phlm"],
  ["Hebrews", "Heb"],
  ["James", "Jas"],
  ["1 Peter", "1 Pet"],
  ["2 Peter", "2 Pet"],
  ["1 John", "1 John"],
  ["2 John", "2 John"],
  ["3 John", "3 John"],
  ["Jude", "Jude"],
  ["Revelation", "Rev"],
];

const ESTHER_SEQUENCE = ["A", 1, 2, 3, "B", 4, "C", "D", 5, 6, 7, 8, "E", 9, 10, "F"];

function unit(abbreviation, label) {
  const result = CANON_UNITS.find(
    (candidate) => candidate.abbr === abbreviation && candidate.label === label,
  );
  assert.ok(result, `Expected to find ${abbreviation} ${label}.`);
  return result;
}

function verseUnits(bookIndex, label, firstVerse = 1, lastVerse = Number.POSITIVE_INFINITY) {
  return Object.values(getVerseTracks())
    .flat()
    .filter(
      (candidate) =>
        candidate.bookIndex === bookIndex &&
        candidate.label === label &&
        candidate.verse >= firstVerse &&
        candidate.verse <= lastVerse,
    );
}

test("the Catholic canon has the expected 46-book OT and 27-book NT", () => {
  assert.equal(BOOKS.length, 73);
  assert.equal(BOOKS.slice(0, 46).length, 46);
  assert.equal(BOOKS.slice(46).length, 27);
  assert.equal(BOOKS[45].name, "Malachi");
  assert.equal(BOOKS[46].name, "Matthew");

  const oldTestamentBookIndexes = new Set(
    CANON_UNITS.filter((entry) => entry.testament === "OT").map((entry) => entry.bookIndex),
  );
  const newTestamentBookIndexes = new Set(
    CANON_UNITS.filter((entry) => entry.testament === "NT").map((entry) => entry.bookIndex),
  );

  assert.equal(oldTestamentBookIndexes.size, 46);
  assert.equal(newTestamentBookIndexes.size, 27);
});

test("the canon has the expected 1,074 OT and 260 NT units", () => {
  const oldTestamentUnits = CANON_UNITS.filter((entry) => entry.testament === "OT");
  const newTestamentUnits = CANON_UNITS.filter((entry) => entry.testament === "NT");

  assert.equal(CANON_UNIT_COUNT, 1_334);
  assert.equal(CANON_UNITS.length, 1_334);
  assert.equal(oldTestamentUnits.length, 1_074);
  assert.equal(newTestamentUnits.length, 260);
  assert.equal(oldTestamentUnits.length + newTestamentUnits.length, CANON_UNIT_COUNT);
  assert.equal(MAX_DAYS, 366);
});

test("book names, SBL abbreviations, and canonical order are exact", () => {
  assert.deepEqual(
    BOOKS.map(({ name, abbr }) => [name, abbr]),
    EXPECTED_BOOKS,
  );

  const psalms = BOOKS.find((book) => book.name === "Psalms");
  assert.equal(psalms.rangeAbbr, "Pss");

  BOOKS.forEach((book, bookIndex) => {
    const units = CANON_UNITS.filter((entry) => entry.bookIndex === bookIndex);
    assert.ok(units.length > 0, `${book.name} should contain at least one unit.`);
    assert.ok(
      units.every(
        (entry) => entry.bookName === book.name && entry.abbr === book.abbr,
      ),
      `${book.name} units should retain their canonical name and abbreviation.`,
    );
  });
});

test("Esther follows the exact Catholic A-F sequence", () => {
  const estherIndex = BOOKS.findIndex((book) => book.name === "Esther");
  const estherUnits = CANON_UNITS.filter((entry) => entry.bookIndex === estherIndex);
  const firstEstherIndex = CANON_UNITS.findIndex((entry) => entry.bookIndex === estherIndex);

  assert.equal(estherIndex, 18);
  assert.deepEqual(BOOKS[estherIndex].units, ESTHER_SEQUENCE);
  assert.deepEqual(
    estherUnits.map((entry) => entry.label),
    ESTHER_SEQUENCE,
  );
  assert.equal(CANON_UNITS[firstEstherIndex - 1].id, "17:16");
  assert.equal(CANON_UNITS[firstEstherIndex + ESTHER_SEQUENCE.length].id, "19:1");
  assert.equal(verseUnits(estherIndex, "B").length, 7);
  assert.equal(verseUnits(estherIndex, "F").length, 11);
});

test("every supported duration from 1 through 366 partitions the whole canon exactly once", () => {
  for (let totalDays = 1; totalDays <= MAX_DAYS; totalDays += 1) {
    const partition = partitionCanon(totalDays);
    let canonIndex = 0;
    let smallestDay = Number.POSITIVE_INFINITY;
    let largestDay = 0;

    assert.equal(partition.length, totalDays, `Duration ${totalDays} returned the wrong day count.`);

    partition.forEach((day, dayIndex) => {
      assert.ok(day.length > 0, `Duration ${totalDays}, day ${dayIndex + 1} was empty.`);
      smallestDay = Math.min(smallestDay, day.length);
      largestDay = Math.max(largestDay, day.length);

      day.forEach((entry) => {
        if (entry !== CANON_UNITS[canonIndex]) {
          assert.fail(
            `Duration ${totalDays} diverged from canonical order at unit ${canonIndex + 1}.`,
          );
        }
        canonIndex += 1;
      });
    });

    assert.equal(canonIndex, CANON_UNIT_COUNT, `Duration ${totalDays} did not cover every unit.`);
    assert.ok(
      largestDay - smallestDay <= 1,
      `Duration ${totalDays} was imbalanced: ${smallestDay}-${largestDay} units per day.`,
    );
  }
});

test("partition boundaries produce all units on one day or across the 366-day maximum", () => {
  const oneDay = partitionCanon(1);
  assert.equal(oneDay.length, 1);
  assert.equal(oneDay[0].length, CANON_UNIT_COUNT);
  assert.strictEqual(oneDay[0][0], CANON_UNITS[0]);
  assert.strictEqual(oneDay[0].at(-1), CANON_UNITS.at(-1));

  const maximumDays = partitionCanon(MAX_DAYS);
  assert.equal(maximumDays.length, MAX_DAYS);
  let canonIndex = 0;
  maximumDays.forEach((day) => {
    assert.ok(day.length > 0);
    day.forEach((entry) => {
      assert.strictEqual(entry, CANON_UNITS[canonIndex]);
      canonIndex += 1;
    });
  });
  assert.equal(canonIndex, CANON_UNIT_COUNT);

  for (const invalidDuration of [0, -1, MAX_DAYS + 1, 1.5, "365", null]) {
    assert.throws(() => partitionCanon(invalidDuration), RangeError);
  }
});

test("citation formatting uses SBL abbreviations, ranges, and en dashes", () => {
  assert.deepEqual(formatCitations([unit("Gen", 1)]), ["Gen 1"]);
  assert.deepEqual(formatCitations([unit("Gen", 1), unit("Gen", 2), unit("Gen", 3)]), [
    "Gen 1–3",
  ]);
  assert.deepEqual(formatCitations([unit("Gen", 1), unit("Gen", 3)]), ["Gen 1", "Gen 3"]);
  assert.deepEqual(formatCitations([unit("Gen", 50), unit("Exod", 1), unit("Exod", 2)]), [
    "Gen 50",
    "Exod 1–2",
  ]);
});

test("citation formatting distinguishes Ps from Pss", () => {
  assert.deepEqual(formatCitations([unit("Ps", 23)]), ["Ps 23"]);
  assert.deepEqual(formatCitations([unit("Ps", 22), unit("Ps", 23)]), ["Pss 22–23"]);
  assert.deepEqual(formatCitations([unit("Ps", 22), unit("Ps", 24)]), ["Ps 22", "Ps 24"]);
});

test("citation formatting keeps Esther additions as separate sense units", () => {
  const estherUnits = CANON_UNITS.filter((entry) => entry.abbr === "Esth");

  assert.deepEqual(formatCitations(estherUnits), [
    "Esth A (11:2–12:6)",
    "Esth 1–3",
    "Esth B (13:1–7)",
    "Esth 4",
    "Esth C (13:8–14:19)",
    "Esth D (15:4–19)",
    "Esth 5–8",
    "Esth E (16:1–24)",
    "Esth 9–10",
    "Esth F (10:4–11:1)",
  ]);
});

test("both reading orders enforce the shared 366-day maximum", () => {
  assert.equal(MAX_DAYS, 366);

  assert.equal(maxDaysForOrder(PLAN_ORDERS.CANONICAL), MAX_DAYS);
  assert.equal(maxDaysForOrder(PLAN_ORDERS.PREFERRED), MAX_DAYS);
  assert.throws(() => maxDaysForOrder("unknown"), RangeError);

  for (const invalidDuration of [0, -1, MAX_DAYS + 1, 1.5, "365", null]) {
    assert.throws(() => partitionPreferred(invalidDuration), RangeError);
  }
  assert.throws(
    () => buildPlan("2026-07-11", MAX_DAYS + 1, PLAN_ORDERS.PREFERRED),
    RangeError,
  );
});

test("preferred-order sense tracks have complete reading-length metadata", () => {
  const sourceTracks = getVerseTracks();
  const senseTracks = getSenseTracks();
  const expected = {
    "old-testament": { verses: 27_606, atoms: 1_094, totalWords: 690_150 },
    gospel: { verses: 3_768, atoms: 1_344, totalWords: 80_080 },
    "new-testament": { verses: 4_174, atoms: 1_030, totalWords: 94_650 },
  };

  assert.deepEqual(Object.keys(senseTracks), PREFERRED_TRACKS.map((track) => track.id));

  PREFERRED_TRACKS.forEach(({ id }) => {
    const senseTrack = senseTracks[id];
    assert.strictEqual(senseTrack.units, sourceTracks[id]);
    assert.equal(sourceTracks[id].length, expected[id].verses);
    assert.equal(senseTrack.boundaries[0], 0);
    assert.equal(senseTrack.boundaries.at(-1), sourceTracks[id].length);
    assert.equal(senseTrack.boundaries.length - 1, expected[id].atoms);
    assert.equal(senseTrack.totalWords, expected[id].totalWords);
    assert.equal(
      sourceTracks[id].reduce((sum, unit) => sum + unit.wordCount, 0),
      senseTrack.totalWords,
    );
    assert.ok(
      sourceTracks[id].every(
        (unit) => Number.isInteger(unit.wordCount) && unit.wordCount > 0,
      ),
      `${id} should have a positive reading-length estimate for every verse.`,
    );
    senseTrack.boundaries.slice(0, -1).forEach((boundary) => {
      assert.equal(
        sourceTracks[id][boundary].senseUnitStart,
        true,
        `${id} boundary ${boundary} should begin a sense unit.`,
      );
    });
  });
});

test("curated cross-paragraph passages stay within one preferred reading", () => {
  const tracks = getVerseTracks();
  const unit = (track, id) => tracks[track].find((entry) => entry.id === id);

  for (let verse = 2; verse <= 17; verse += 1) {
    assert.equal(unit("gospel", `46:1:${verse}`).senseUnitStart, false);
  }
  assert.equal(unit("gospel", "46:1:18").senseUnitStart, true);

  assert.equal(unit("gospel", "49:7:53").senseUnitStart, true);
  for (const verse of [2, 9, 11]) {
    assert.equal(unit("gospel", `49:8:${verse}`).senseUnitStart, false);
  }
  assert.equal(unit("gospel", "49:8:12").senseUnitStart, true);

  assert.equal(unit("old-testament", "3:25:19").senseUnitStart, false);
  assert.equal(unit("old-testament", "3:26:1").senseUnitStart, false);
  assert.equal(unit("old-testament", "3:27:1").senseUnitStart, true);
});

test("every preferred-order duration covers each track exactly at sense-unit boundaries", () => {
  const sourceTracks = getVerseTracks();
  const expectedTrackIds = PREFERRED_TRACKS.map((track) => track.id);

  for (let totalDays = 1; totalDays <= MAX_DAYS; totalDays += 1) {
    const partition = partitionPreferred(totalDays);
    const cursors = Object.fromEntries(expectedTrackIds.map((track) => [track, 0]));

    assert.equal(
      partition.length,
      totalDays,
      `Preferred duration ${totalDays} returned the wrong day count.`,
    );

    partition.forEach((readings, dayIndex) => {
      assert.deepEqual(
        readings.map((reading) => reading.track),
        expectedTrackIds,
        `Preferred duration ${totalDays}, day ${dayIndex + 1} returned tracks out of order.`,
      );

      const estimatedWords = Object.fromEntries(
        readings.map((reading) => [reading.track, reading.estimatedWords]),
      );
      assert.ok(
        estimatedWords["old-testament"] > estimatedWords["new-testament"] &&
          estimatedWords["new-testament"] > estimatedWords.gospel,
        `Preferred duration ${totalDays}, day ${dayIndex + 1} did not have estimated OT > NT > Gospel reading length.`,
      );

      readings.forEach((reading) => {
        assert.ok(
          reading.units.length > 0,
          `Preferred duration ${totalDays}, day ${dayIndex + 1}, ${reading.track} was empty.`,
        );
        assert.equal(
          reading.units[0].senseUnitStart,
          true,
          `Preferred duration ${totalDays}, day ${dayIndex + 1}, ${reading.track} split a sense unit.`,
        );
        assert.equal(
          reading.estimatedWords,
          reading.units.reduce((sum, unit) => sum + unit.wordCount, 0),
          `Preferred duration ${totalDays}, day ${dayIndex + 1}, ${reading.track} reported the wrong estimated length.`,
        );

        reading.units.forEach((unit) => {
          const cursor = cursors[reading.track];
          if (unit !== sourceTracks[reading.track][cursor]) {
            assert.fail(
              `Preferred duration ${totalDays} changed ${reading.track} identity or order at index ${cursor}.`,
            );
          }
          cursors[reading.track] += 1;
        });
      });
    });

    expectedTrackIds.forEach((track) => {
      assert.equal(
        cursors[track],
        sourceTracks[track].length,
        `Preferred duration ${totalDays} did not cover all ${track} verses.`,
      );
    });
  }
});

test("representative preferred plans stay approximately balanced within each track", () => {
  for (const totalDays of [30, 100, 365, MAX_DAYS]) {
    const partition = partitionPreferred(totalDays);

    for (const { id } of PREFERRED_TRACKS) {
      const estimates = partition.map(
        (readings) => readings.find((reading) => reading.track === id).estimatedWords,
      );
      const mean = estimates.reduce((sum, estimate) => sum + estimate, 0) / totalDays;
      const rootMeanSquareDeviation = Math.sqrt(
        estimates.reduce((sum, estimate) => sum + (estimate - mean) ** 2, 0) /
          totalDays,
      );

      assert.ok(
        rootMeanSquareDeviation / mean < 0.25,
        `${totalDays}-day ${id} readings should remain approximately balanced.`,
      );
    }
  }
});

test("preferred verse citations use SBL forms for ranges and Esther additions", () => {
  assert.deepEqual(formatVerseCitations([]), []);
  assert.deepEqual(formatVerseCitations(verseUnits(0, 1, 2, 4)), ["Gen 1:2–4"]);
  assert.deepEqual(
    formatVerseCitations([...verseUnits(0, 1), ...verseUnits(0, 2)]),
    ["Gen 1–2"],
  );
  assert.deepEqual(
    formatVerseCitations([...verseUnits(22, 22), ...verseUnits(22, 23)]),
    ["Pss 22–23"],
  );
  assert.deepEqual(formatVerseCitations(verseUnits(18, "A")), [
    "Esth A (11:2–12:6)",
  ]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "B")), ["Esth B (13:1–7)"]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "C")), [
    "Esth C (13:8–14:19)",
  ]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "D")), ["Esth D (15:4–19)"]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "E")), ["Esth E (16:1–24)"]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "F")), [
    "Esth F (10:4–11:1)",
  ]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "C", 5, 8)), [
    "Esth C:5–8 (13:12–15)",
  ]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "A", 10, 13)), [
    "Esth A:10–13 (11:11–12:2)",
  ]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "C", 10, 14)), [
    "Esth C:10–14 (13:17–14:3)",
  ]);
  assert.deepEqual(formatVerseCitations(verseUnits(18, "F", 9, 11)), [
    "Esth F:9–11 (10:12–11:1)",
  ]);
});

test("preferred verse data excludes empty NABRE markers without making chapters look partial", () => {
  const tobit6 = verseUnits(16, 6);
  const wisdom12 = verseUnits(26, 12);
  const matthew17 = verseUnits(46, 17);
  const mark9 = verseUnits(47, 9);

  assert.equal(tobit6[0].verse, 2);
  assert.ok(!tobit6.some((entry) => entry.verse === 1));
  assert.deepEqual(formatVerseCitations(tobit6), ["Tob 6"]);

  assert.equal(wisdom12[0].verse, 2);
  assert.ok(!wisdom12.some((entry) => entry.verse === 1));
  assert.deepEqual(formatVerseCitations(wisdom12), ["Wis 12"]);

  assert.ok(!matthew17.some((entry) => entry.verse === 21));
  assert.deepEqual(formatVerseCitations(matthew17), ["Matt 17"]);
  assert.deepEqual(formatVerseCitations(verseUnits(46, 17, 20, 22)), ["Matt 17:20–22"]);

  assert.ok(!mark9.some((entry) => entry.verse === 44 || entry.verse === 46));
  assert.deepEqual(formatVerseCitations(mark9), ["Mark 9"]);
});

test("civil-date parsing validates dates and round-trips canonical values", () => {
  for (const value of ["0099-01-02", "2024-02-29", "2026-07-11", "10000-12-31"]) {
    const timestamp = parseCivilDate(value);
    assert.notEqual(timestamp, null, `${value} should be valid.`);
    assert.equal(formatCivilDate(timestamp), value);
  }

  for (const value of [null, "", "2026-7-11", "2023-02-29", "2024-13-01", "2024-04-31"]) {
    assert.equal(parseCivilDate(value), null, `${String(value)} should be invalid.`);
  }

  assert.throws(() => addCivilDays("not-a-date", 1), TypeError);
  assert.throws(() => addCivilDays("2026-01-01", 1.5), TypeError);
  assert.throws(() => inclusiveDayCount("not-a-date", "2026-01-01"), TypeError);
});

test("inclusive date counts remain correct across Chicago daylight-saving changes", () => {
  assert.equal(inclusiveDayCount("2026-03-07", "2026-03-09"), 3);
  assert.equal(addCivilDays("2026-03-07", 1), "2026-03-08");
  assert.equal(addCivilDays("2026-03-08", 1), "2026-03-09");

  assert.equal(inclusiveDayCount("2026-10-31", "2026-11-02"), 3);
  assert.equal(addCivilDays("2026-11-01", 1), "2026-11-02");
});

test("civil dates handle inclusive endpoints, leap days, and year rollover", () => {
  assert.equal(inclusiveDayCount("2026-07-11", "2026-07-11"), 1);
  assert.equal(inclusiveDayCount("2026-07-11", "2026-07-12"), 2);
  assert.equal(inclusiveDayCount("2026-07-12", "2026-07-11"), 0);

  assert.equal(addCivilDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addCivilDays("2024-02-28", 2), "2024-03-01");
  assert.equal(inclusiveDayCount("2024-02-28", "2024-03-01"), 3);
  assert.equal(addCivilDays("2023-02-28", 1), "2023-03-01");

  assert.equal(addCivilDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addCivilDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addCivilDays("2024-01-01", MAX_DAYS - 1), "2024-12-31");
  assert.equal(inclusiveDayCount("2024-01-01", "2024-12-31"), MAX_DAYS);
});

test("buildPlan preserves the one-day plan endpoints", () => {
  const plan = buildPlan("2026-07-11", 1);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].day, 1);
  assert.equal(plan[0].date, "2026-07-11");
  assert.equal(plan[0].units.length, CANON_UNIT_COUNT);
  assert.strictEqual(plan[0].units[0], CANON_UNITS[0]);
  assert.strictEqual(plan[0].units.at(-1), CANON_UNITS.at(-1));
  assert.equal(plan[0].citations[0], "Gen 1–50");
  assert.equal(plan[0].citations.at(-1), "Rev 1–22");
});

test("buildPlan preserves the maximum-duration plan endpoints", () => {
  const plan = buildPlan("2024-01-01", MAX_DAYS);

  assert.equal(plan.length, MAX_DAYS);
  assert.deepEqual(
    {
      day: plan[0].day,
      date: plan[0].date,
      citation: plan[0].citations[0],
      unit: plan[0].units[0].id,
    },
    { day: 1, date: "2024-01-01", citation: "Gen 1–3", unit: "0:1" },
  );
  assert.deepEqual(
    {
      day: plan.at(-1).day,
      date: plan.at(-1).date,
      citation: plan.at(-1).citations.at(-1),
      unit: plan.at(-1).units.at(-1).id,
    },
    { day: MAX_DAYS, date: "2024-12-31", citation: "Rev 19–22", unit: "72:22" },
  );

  let canonIndex = 0;
  plan.forEach((entry, index) => {
    assert.equal(entry.day, index + 1);
    entry.units.forEach((unit) => {
      assert.strictEqual(unit, CANON_UNITS[canonIndex]);
      canonIndex += 1;
    });
  });
  assert.equal(canonIndex, CANON_UNIT_COUNT);
});

test("buildPlan produces correct representative dates and canonical endpoints", () => {
  const plan = buildPlan("2026-07-11", 365);

  assert.equal(plan.length, 365);
  assert.equal(plan[0].date, "2026-07-11");
  assert.equal(plan.at(-1).date, "2027-07-10");
  assert.equal(plan[0].units[0].id, "0:1");
  assert.equal(plan.at(-1).units.at(-1).id, "72:22");
  assert.equal(plan.flatMap((entry) => entry.units).length, CANON_UNIT_COUNT);

  assert.throws(() => buildPlan("not-a-date", 365), TypeError);
  assert.throws(() => buildPlan("2026-07-11", 0), RangeError);
  assert.throws(() => buildPlan("2026-07-11", MAX_DAYS + 1), RangeError);
});

test("the verification preview returns only the first five plan days", () => {
  const plan = buildPlan("2026-07-11", 10);
  const preview = previewPlan(plan);

  assert.equal(PREVIEW_DAY_COUNT, 5);
  assert.equal(preview.length, PREVIEW_DAY_COUNT);
  preview.forEach((entry, index) => assert.strictEqual(entry, plan[index]));
  assert.equal(previewPlan(plan.slice(0, 3)).length, 3);
  assert.throws(() => previewPlan(null), TypeError);
  assert.throws(() => previewPlan(plan, 0), RangeError);
});

test("a 365-day preferred plan has three ordered readings and the correct endpoints", () => {
  const plan = buildPlan("2026-07-11", 365, PLAN_ORDERS.PREFERRED);
  const firstReadings = Object.fromEntries(
    plan[0].readings.map((reading) => [reading.track, reading]),
  );
  const secondReadings = Object.fromEntries(
    plan[1].readings.map((reading) => [reading.track, reading]),
  );
  const lastReadings = Object.fromEntries(
    plan.at(-1).readings.map((reading) => [reading.track, reading]),
  );

  assert.equal(plan.length, 365);
  assert.deepEqual(
    { day: plan[0].day, date: plan[0].date, order: plan[0].order },
    { day: 1, date: "2026-07-11", order: PLAN_ORDERS.PREFERRED },
  );
  assert.deepEqual(
    { day: plan.at(-1).day, date: plan.at(-1).date, order: plan.at(-1).order },
    { day: 365, date: "2027-07-10", order: PLAN_ORDERS.PREFERRED },
  );
  assert.deepEqual(
    plan[0].readings.map((reading) => reading.track),
    PREFERRED_TRACKS.map((track) => track.id),
  );

  assert.equal(firstReadings["old-testament"].units[0].id, "0:1:1");
  assert.equal(firstReadings.gospel.units[0].id, "46:1:1");
  assert.equal(firstReadings.gospel.units.at(-1).id, "46:1:17");
  assert.deepEqual(firstReadings.gospel.citations, ["Matt 1:1–17"]);
  assert.equal(secondReadings.gospel.units[0].id, "46:1:18");
  assert.equal(firstReadings["new-testament"].units[0].id, "50:1:1");
  assert.equal(lastReadings["old-testament"].units.at(-1).id, "45:3:24");
  assert.equal(lastReadings.gospel.units.at(-1).id, "49:21:25");
  assert.equal(lastReadings["new-testament"].units.at(-1).id, "72:22:21");

  const expectedVerseTotal = Object.values(getVerseTracks()).reduce(
    (sum, units) => sum + units.length,
    0,
  );
  assert.equal(plan.flatMap((entry) => entry.units).length, expectedVerseTotal);
  plan.forEach((entry, index) => {
    assert.equal(entry.day, index + 1);
    assert.equal(entry.date, addCivilDays("2026-07-11", index));
    assert.equal(entry.readings.length, 3);
  });
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOOKS,
  CANON_UNITS,
  MAX_DAYS,
  parseCivilDate,
  formatCivilDate,
  addCivilDays,
  inclusiveDayCount,
  partitionCanon,
  formatCitations,
  buildPlan,
} = require("../themes/latex_fradamroyal/assets/js/bible-reading-plan.js");

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

  assert.equal(MAX_DAYS, 1_334);
  assert.equal(CANON_UNITS.length, 1_334);
  assert.equal(oldTestamentUnits.length, 1_074);
  assert.equal(newTestamentUnits.length, 260);
  assert.equal(oldTestamentUnits.length + newTestamentUnits.length, MAX_DAYS);
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
});

test("every duration from 1 through 1,334 partitions the whole canon exactly once", () => {
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

    assert.equal(canonIndex, MAX_DAYS, `Duration ${totalDays} did not cover every unit.`);
    assert.ok(
      largestDay - smallestDay <= 1,
      `Duration ${totalDays} was imbalanced: ${smallestDay}-${largestDay} units per day.`,
    );
  }
});

test("partition boundaries produce all units on one day or one unit per day", () => {
  const oneDay = partitionCanon(1);
  assert.equal(oneDay.length, 1);
  assert.equal(oneDay[0].length, MAX_DAYS);
  assert.strictEqual(oneDay[0][0], CANON_UNITS[0]);
  assert.strictEqual(oneDay[0].at(-1), CANON_UNITS.at(-1));

  const maximumDays = partitionCanon(MAX_DAYS);
  assert.equal(maximumDays.length, MAX_DAYS);
  maximumDays.forEach((day, index) => {
    assert.equal(day.length, 1);
    assert.strictEqual(day[0], CANON_UNITS[index]);
  });

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
    "Esth A",
    "Esth 1–3",
    "Esth B",
    "Esth 4",
    "Esth C",
    "Esth D",
    "Esth 5–8",
    "Esth E",
    "Esth 9–10",
    "Esth F",
  ]);
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
  assert.equal(addCivilDays("2024-01-01", MAX_DAYS - 1), "2027-08-26");
  assert.equal(inclusiveDayCount("2024-01-01", "2027-08-26"), MAX_DAYS);
});

test("buildPlan preserves the one-day plan endpoints", () => {
  const plan = buildPlan("2026-07-11", 1);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].day, 1);
  assert.equal(plan[0].date, "2026-07-11");
  assert.equal(plan[0].units.length, MAX_DAYS);
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
    { day: 1, date: "2024-01-01", citation: "Gen 1", unit: "0:1" },
  );
  assert.deepEqual(
    {
      day: plan.at(-1).day,
      date: plan.at(-1).date,
      citation: plan.at(-1).citations[0],
      unit: plan.at(-1).units[0].id,
    },
    { day: MAX_DAYS, date: "2027-08-26", citation: "Rev 22", unit: "72:22" },
  );

  plan.forEach((entry, index) => {
    assert.equal(entry.day, index + 1);
    assert.equal(entry.units.length, 1);
    assert.strictEqual(entry.units[0], CANON_UNITS[index]);
  });
});

test("buildPlan produces correct representative dates and canonical endpoints", () => {
  const plan = buildPlan("2026-07-11", 365);

  assert.equal(plan.length, 365);
  assert.equal(plan[0].date, "2026-07-11");
  assert.equal(plan.at(-1).date, "2027-07-10");
  assert.equal(plan[0].units[0].id, "0:1");
  assert.equal(plan.at(-1).units.at(-1).id, "72:22");
  assert.equal(plan.flatMap((entry) => entry.units).length, MAX_DAYS);

  assert.throws(() => buildPlan("not-a-date", 365), TypeError);
  assert.throws(() => buildPlan("2026-07-11", 0), RangeError);
  assert.throws(() => buildPlan("2026-07-11", MAX_DAYS + 1), RangeError);
});

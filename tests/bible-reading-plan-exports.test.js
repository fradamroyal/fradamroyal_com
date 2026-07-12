"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PLAN_ORDERS,
  addCivilDays,
  buildPlan,
} = require("../themes/latex_fradamroyal/assets/js/bible-reading-plan.js");
const {
  MIME_TYPES,
  serializePlanToCsv,
  serializePlanToMarkdown,
  serializePlanToPdf,
  suggestFilename,
  buildPlanExport,
} = require("../themes/latex_fradamroyal/assets/js/bible-reading-plan-exports.js");

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" && source[index + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function pdfText(bytes) {
  return Buffer.from(bytes).toString("latin1");
}

test("CSV export escapes punctuation and newlines without changing field values", () => {
  const plan = [
    {
      day: 1,
      date: "2026-07-12",
      readings: [
        {
          label: 'Old Testament, "first"',
          citations: ["Gen 1:1\nGen 1:2", 'Exod 1:1, "Moses"'],
        },
      ],
    },
  ];

  const csv = serializePlanToCsv(plan);
  const rows = parseCsv(csv);

  assert.ok(csv.endsWith("\r\n"));
  assert.deepEqual(rows[0], ["Day", "Date", "Readings"]);
  assert.deepEqual(rows[1], [
    "1",
    "2026-07-12",
    'Old Testament, "first": Gen 1:1\nGen 1:2; Exod 1:1, "Moses"',
  ]);
  assert.equal(rows.length, 2);
});

test("CSV export contains every day and every citation in the full preferred plan", () => {
  const plan = buildPlan("2026-07-12", 30, PLAN_ORDERS.PREFERRED);
  const rows = parseCsv(serializePlanToCsv(plan));

  assert.equal(rows.length, plan.length + 1);
  plan.forEach((entry, index) => {
    const row = rows[index + 1];
    assert.equal(row[0], String(entry.day));
    assert.equal(row[1], entry.date);
    entry.readings.forEach((reading) => {
      assert.ok(row[2].includes(`${reading.label}:`));
      reading.citations.forEach((citation) => assert.ok(row[2].includes(citation)));
    });
  });
});

test("Markdown export gives every day one unchecked box and preserves all citations", () => {
  const plan = buildPlan("2026-07-12", 31, PLAN_ORDERS.PREFERRED);
  const markdown = serializePlanToMarkdown(plan, { title: "Fr. Adam's Plan" });
  const dayCheckboxes = markdown.match(/^- \[ \] \*\*Day \d+ - /gm) || [];

  assert.match(markdown, /^# Fr\. Adam's Plan$/m);
  assert.equal(dayCheckboxes.length, plan.length);
  plan.forEach((entry) => {
    assert.match(markdown, new RegExp(`^- \\[ \\] \\*\\*Day ${entry.day} - ${entry.date}\\*\\*$`, "m"));
    entry.readings.forEach((reading) => {
      assert.ok(markdown.includes(`  - **${reading.label}:**`));
      reading.citations.forEach((citation) => assert.ok(markdown.includes(citation)));
    });
  });
  assert.doesNotMatch(markdown, /^- \[[xX]\]/m);
});

test("PDF export is structurally complete and includes every scheduled day", () => {
  const plan = buildPlan("2026-07-12", 75);
  const bytes = serializePlanToPdf(plan);
  const pdf = pdfText(bytes);

  assert.ok(bytes instanceof Uint8Array);
  assert.ok(pdf.startsWith("%PDF-1.4\n"));
  assert.ok(pdf.endsWith("%%EOF\n"));

  const pageCount = Number(pdf.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)?.[1]);
  assert.ok(pageCount > 1);
  assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, pageCount);
  for (let page = 1; page <= pageCount; page += 1) {
    assert.ok(pdf.includes(`(Page ${page} of ${pageCount}) Tj`));
  }

  plan.forEach((entry) => {
    assert.ok(pdf.includes(`(Day ${entry.day} - ${entry.date}) Tj`));
    entry.citations.forEach((citation) => {
      assert.ok(pdf.includes(citation.replace(/[\u2010-\u2015\u2212]/g, "-")));
    });
  });

  const xrefOffset = Number(pdf.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
  assert.ok(Number.isInteger(xrefOffset));
  assert.equal(pdf.slice(xrefOffset, xrefOffset + 5), "xref\n");
  assert.match(pdf, /trailer\n<< \/Size \d+ \/Root 1 0 R >>\n/);
});

test("PDF export sanitizes non-ASCII text and escapes PDF string delimiters", () => {
  const plan = [
    {
      day: 1,
      date: "2026-07-12",
      citations: ["Ps 1:1–6 — “café” (test) \\ path"],
    },
  ];
  const bytes = serializePlanToPdf(plan, { title: "Lectión … Plan" });
  const pdf = pdfText(bytes);

  assert.ok([...bytes].every((byte) => byte < 128));
  assert.ok(pdf.includes("(Lection ... Plan) Tj"));
  assert.ok(pdf.includes('(Reading: Ps 1:1-6 - "cafe" \\(test\\) \\\\ path) Tj'));
  assert.doesNotMatch(pdf, /[-ÿ]/);
});

test("export descriptors provide stable filenames, extensions, MIME types, and full data", () => {
  const plan = buildPlan("2026-07-12", 3);
  const formats = [
    ["csv", "csv", MIME_TYPES.csv, "string"],
    ["markdown", "md", MIME_TYPES.markdown, "string"],
    ["pdf", "pdf", MIME_TYPES.pdf, "bytes"],
  ];

  assert.equal(suggestFilename(plan, "md"), "bible-reading-plan-2026-07-12-to-2026-07-14.md");

  formats.forEach(([format, extension, mimeType, dataType]) => {
    const result = buildPlanExport(plan, format);
    assert.equal(result.extension, extension);
    assert.equal(result.mimeType, mimeType);
    assert.equal(
      result.filename,
      `bible-reading-plan-2026-07-12-to-${addCivilDays("2026-07-12", 2)}.${extension}`,
    );
    if (dataType === "bytes") {
      assert.ok(result.data instanceof Uint8Array);
    } else {
      assert.equal(typeof result.data, dataType);
    }
    assert.ok(Object.isFrozen(result));
  });

  assert.throws(() => buildPlanExport(plan, "docx"), RangeError);
  assert.throws(() => serializePlanToCsv(null), TypeError);
  assert.throws(() => serializePlanToMarkdown([null]), TypeError);
  assert.throws(() => serializePlanToPdf("not a plan"), TypeError);
});

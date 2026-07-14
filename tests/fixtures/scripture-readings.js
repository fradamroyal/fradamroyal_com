"use strict";

const VALID_SCRIPTURE_READING_FIXTURES = [
  {
    name: "same-chapter and cross-chapter parts",
    metadata: `[[readings]]
label = 'First Reading'
citation = '1 Chr 15:3–4, 15–16; 16:1–2'`,
  },
  {
    name: "cross-chapter range",
    metadata: `[[readings]]
label = 'Second Reading'
citation = 'Jas 3:16–4:3'`,
  },
  {
    name: "later segment crossing into the next chapter",
    metadata: `[[readings]]
label = 'Sixth Reading'
citation = 'Bar 3:9–15, 32–4:4'`,
  },
  {
    name: "multiple-psalm abbreviation from the canonical parenthetical note",
    metadata: `[[readings]]
label = 'Psalm after Seventh Reading'
citation = 'Pss 42:3, 5; 43:3, 4'`,
  },
  {
    name: "one-chapter book",
    metadata: `[[readings]]
label = 'Second Reading'
citation = 'Phlm 9–10, 12–17'`,
  },
  {
    name: "numbered one-chapter book",
    metadata: `[[readings]]
label = 'Second Reading'
citation = '2 John 4–9'`,
  },
  {
    name: "verse suffixes in multiple chapters",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Rev 11:19a; 12:1–6a, 10ab'`,
  },
  {
    name: "whole chapters",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Gen 1–3'`,
  },
  {
    name: "multiple whole psalms",
    metadata: `[[readings]]
label = 'Responsorial Psalms'
citation = 'Pss 22–23'`,
  },
  {
    name: "complete Esther addition with numeric versification",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Esth A (11:2–12:6)'`,
  },
  {
    name: "partial Esther addition with numeric versification",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Esth C:5–8 (13:12–15)'`,
  },
  {
    name: "commented reading header before an ordinary table",
    metadata: `  [[readings]] # source note
label = 'Gospel'
citation = 'John 3:16–18'

[params]
label = 'Card label'`,
  },
];

const INVALID_SCRIPTURE_READING_FIXTURES = [
  {
    name: "missing label",
    metadata: `[[readings]]
citation = 'Matt 5:1–12'`,
    expectedError: "exactly one label",
  },
  {
    name: "blank label",
    metadata: `[[readings]]
label = ''
citation = 'Matt 5:1–12'`,
    expectedError: "nonblank label",
  },
  {
    name: "duplicate label",
    metadata: `[[readings]]
label = 'Gospel'
label = 'Procession Gospel'
citation = 'Matt 21:1–11'`,
    expectedError: "exactly one label",
  },
  {
    name: "missing citation",
    metadata: `[[readings]]
label = 'Gospel'`,
    expectedError: "exactly one citation",
  },
  {
    name: "blank citation",
    metadata: `[[readings]]
label = 'Gospel'
citation = ''`,
    expectedError: "nonblank citation",
  },
  {
    name: "duplicate citation",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Matt 5:1–12'
citation = 'Luke 6:20–23'`,
    expectedError: "exactly one citation",
  },
  {
    name: "unknown book abbreviation",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Mt 5:1–12'`,
    expectedError: "canonical SBL book abbreviation",
  },
  {
    name: "book without a passage locator",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Matt'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "ASCII range hyphen",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Luke 7:11-17'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "dangling separator",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Isa 1:10, 16–20,'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "malformed chapter and verse separator",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'John 3::16'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "unsupported parenthetical annotation",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'John 20:19–31 (long form)'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "Pss used for only one psalm",
    metadata: `[[readings]]
label = 'Responsorial Psalm'
citation = 'Pss 42:2–3'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "Ps used across multiple psalms",
    metadata: `[[readings]]
label = 'Responsorial Psalm'
citation = 'Ps 42:2; 43:3'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "chapter notation on a one-chapter book",
    metadata: `[[readings]]
label = 'Second Reading'
citation = 'Phlm 1:9–10'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "unknown Esther addition",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Esth G (1:1)'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "ordinary table cannot complete a reading record",
    metadata: `[[readings]] # source note
label = 'Gospel'

[params]
citation = 'John 3:16–18'`,
    expectedError: "exactly one citation",
  },
  {
    name: "repeated verse suffix",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Matt 5:1aaaa'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "descending verse range",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Matt 5:12–1'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "descending subverse range",
    metadata: `[[readings]]
label = 'Gospel'
citation = 'Matt 5:1b–1a'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "descending one-chapter-book range",
    metadata: `[[readings]]
label = 'Second Reading'
citation = 'Jude 25–2'`,
    expectedError: "valid SBL passage locator",
  },
  {
    name: "descending chapter range",
    metadata: `[[readings]]
label = 'First Reading'
citation = 'Gen 3–1'`,
    expectedError: "valid SBL passage locator",
  },
];

module.exports = {
  INVALID_SCRIPTURE_READING_FIXTURES,
  VALID_SCRIPTURE_READING_FIXTURES,
};

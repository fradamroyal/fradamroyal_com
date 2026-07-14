"use strict";

const ARTICLE_DESCRIPTION_BASELINE_PATHS = [
  "content/homilies/2024/all_saints.md",
  "content/homilies/2024/assumption_bvm.md",
  "content/homilies/2024/christ_the_king.md",
  "content/homilies/2024/christmas.md",
  "content/homilies/2024/eighteenth_sunday_ordinary_time.md",
  "content/homilies/2024/fifteenth_sunday_ordinary_time.md",
  "content/homilies/2024/first_sunday_advent.md",
  "content/homilies/2024/fourteenth_sunday_ordinary_time.md",
  "content/homilies/2024/fourth_sunday_advent.md",
  "content/homilies/2024/holy_family.md",
  "content/homilies/2024/immaculate_conception.md",
  "content/homilies/2024/nineteenth_sunday_ordinary_time.md",
  "content/homilies/2024/second_sunday_advent.md",
  "content/homilies/2024/seventeenth_sunday_ordinary_time.md",
  "content/homilies/2024/sixteenth_sunday_ordinary_time.md",
  "content/homilies/2024/thirteenth_sunday_ordinary_time.md",
  "content/homilies/2024/thirtieth_sunday_ordinary_time.md",
  "content/homilies/2024/thirtyfirst_sunday_ordinary_time.md",
  "content/homilies/2024/thirtythird_sunday_ordinary_time.md",
  "content/homilies/2024/twelfth_sunday_ordinary_time.md",
  "content/homilies/2024/twentieth_sunday_ordinary_time.md",
  "content/homilies/2024/twentyfifth_sunday_ordinary_time.md",
  "content/homilies/2024/twentyfirst_sunday_ordinary_time.md",
  "content/homilies/2024/twentyfourth_sunday_ordinary_time.md",
  "content/homilies/2024/twentyninth_sunday_ordinary_time.md",
  "content/homilies/2024/twentysecond_sunday_ordinary_time.md",
  "content/homilies/2024/twentyseventh_sunday_ordinary_time.md",
  "content/homilies/2024/twentysixth_sunday_ordinary_time.md",
  "content/homilies/2024/twentythird_sunday_ordinary_time.md",
  "content/homilies/2025/all_saints.md",
  "content/homilies/2025/all_souls.md",
  "content/homilies/2025/ascension.md",
  "content/homilies/2025/ash_wednesday.md",
  "content/homilies/2025/assumption.md",
  "content/homilies/2025/assumption_day.md",
  "content/homilies/2025/baptism_lord.md",
  "content/homilies/2025/christ_king.md",
  "content/homilies/2025/christmas_day.md",
  "content/homilies/2025/christmas_midnight.md",
  "content/homilies/2025/corpus_christi.md",
  "content/homilies/2025/dedication_john_lateran.md",
  "content/homilies/2025/easter_sunday.md",
  "content/homilies/2025/eighteenth_sunday_ordinary_time.md",
  "content/homilies/2025/eighth_sunday_ordinary_time.md",
  "content/homilies/2025/epiphany.md",
  "content/homilies/2025/exaltation_cross.md",
  "content/homilies/2025/fifteenth_sunday_ordinary_time.md",
  "content/homilies/2025/fifth_sunday_easter.md",
  "content/homilies/2025/fifth_sunday_lent.md",
  "content/homilies/2025/fifth_sunday_ordinary_time.md",
  "content/homilies/2025/first_sunday_advent.md",
  "content/homilies/2025/fourteenth_sunday_ordinary_time.md",
  "content/homilies/2025/fourth_sunday_advent.md",
  "content/homilies/2025/fourth_sunday_easter.md",
  "content/homilies/2025/fourth_sunday_lent.md",
  "content/homilies/2025/good_friday.md",
  "content/homilies/2025/holy_family.md",
  "content/homilies/2025/holy_saturday.md",
  "content/homilies/2025/holy_thursday.md",
  "content/homilies/2025/mary_mother_of_god.md",
  "content/homilies/2025/monday_second_week_lent.md",
  "content/homilies/2025/monday_third_week_lent.md",
  "content/homilies/2025/nineteenth_sunday_ordinary_time.md",
  "content/homilies/2025/our_lady_guadalupe.md",
  "content/homilies/2025/palm_sunday.md",
  "content/homilies/2025/pentecost.md",
  "content/homilies/2025/pentecost_vigil.md",
  "content/homilies/2025/presentation_of_the_lord.md",
  "content/homilies/2025/saints_peter_paul.md",
  "content/homilies/2025/second_sunday_advent.md",
  "content/homilies/2025/second_sunday_easter.md",
  "content/homilies/2025/second_sunday_lent.md",
  "content/homilies/2025/second_sunday_ordinary_time.md",
  "content/homilies/2025/seventeenth_sunday_ordinary_time.md",
  "content/homilies/2025/sixteenth_sunday_ordinary_time.md",
  "content/homilies/2025/sixth_sunday_easter.md",
  "content/homilies/2025/third_sunday_advent.md",
  "content/homilies/2025/third_sunday_easter.md",
  "content/homilies/2025/third_sunday_lent.md",
  "content/homilies/2025/third_sunday_ordinary_time.md",
  "content/homilies/2025/thirtieth_sunday_ordinary_time.md",
  "content/homilies/2025/thursday_eighteenth_week_ordinary_time.md",
  "content/homilies/2025/thursday_second_week_lent.md",
  "content/homilies/2025/transfiguration.md",
  "content/homilies/2025/trinity.md",
  "content/homilies/2025/tuesday_second_week_lent.md",
  "content/homilies/2025/twentieth_sunday_ordinary_time.md",
  "content/homilies/2025/twentyeighth_sunday_ordinary_time.md",
  "content/homilies/2025/twentyfifth_sunday_ordinary_time.md",
  "content/homilies/2025/twentyfirst_sunday_ordinary_time.md",
  "content/homilies/2025/twentyninth_sunday_ordinary_time.md",
  "content/homilies/2025/twentysecond_sunday_ordinary_time.md",
  "content/homilies/2025/twentyseventh_sunday_ordinary_time.md",
  "content/homilies/2025/twentysixth_sunday_ordinary_time.md",
  "content/homilies/2025/twentythird_sunday_ordinary_time.md",
  "content/homilies/2026/ascension.md",
  "content/homilies/2026/ash_wednesday.md",
  "content/homilies/2026/baptism_of_the_lord.md",
  "content/homilies/2026/called_by_name.md",
  "content/homilies/2026/corpus_christi.md",
  "content/homilies/2026/divine_mercy_sunday.md",
  "content/homilies/2026/easter_sunday.md",
  "content/homilies/2026/easter_vigil.md",
  "content/homilies/2026/eleventh_sunday_ordinary_time.md",
  "content/homilies/2026/epiphany.md",
  "content/homilies/2026/fifteenth_sunday_ordinary_time.md",
  "content/homilies/2026/fifth_sunday_easter.md",
  "content/homilies/2026/fifth_sunday_lent.md",
  "content/homilies/2026/fifth_sunday_ordinary_time.md",
  "content/homilies/2026/first_sunday_lent.md",
  "content/homilies/2026/fourteenth_sunday_ordinary_time.md",
  "content/homilies/2026/fourth_sunday_easter.md",
  "content/homilies/2026/fourth_sunday_lent.md",
  "content/homilies/2026/fourth_sunday_ordinary_time.md",
  "content/homilies/2026/good_friday.md",
  "content/homilies/2026/holy_thursday.md",
  "content/homilies/2026/joseph_the_worker.md",
  "content/homilies/2026/mary_mother_of_god.md",
  "content/homilies/2026/palm_sunday.md",
  "content/homilies/2026/pentecost.md",
  "content/homilies/2026/pentecost_vigil.md",
  "content/homilies/2026/second_sunday_lent.md",
  "content/homilies/2026/sixth_sunday_easter.md",
  "content/homilies/2026/sixth_sunday_ordinary_time.md",
  "content/homilies/2026/third_sunday_easter.md",
  "content/homilies/2026/third_sunday_lent.md",
  "content/homilies/2026/third_sunday_ordinary_time.md",
  "content/homilies/2026/thirteenth_sunday_ordinary_time.md",
  "content/homilies/2026/trinity.md",
  "content/homilies/2026/twelfth_sunday_ordinary_time.md",
  "content/reflections/2024/advent_by_candlelight.md",
  "content/reflections/2024/night_of_recollection_advent_through_our_lady.md",
  "content/reflections/2024/night_of_recollection_growing_virtue.md",
  "content/reflections/2024/night_of_recollection_hypocrisy.md",
  "content/reflections/2024/night_of_recollection_prayer_work_penitence.md",
  "content/reflections/2024/widow_ministry_reflection.md",
  "content/reflections/2025/advent_by_candlelight.md",
  "content/reflections/2025/pride_humility_franciscan.md",
  "content/reflections/2025/tragedy_solomon.md",
  "content/reflections/2025/two_paintings/index.md",
  "content/reflections/2026/catholic_response_fear.md",
];

const VALID_ARTICLE_FRONT_MATTER_FIXTURES = [
  {
    name: "calendar-date article",
    sourcePath: "content/homilies/2026/calendar_date.md",
    metadata: `title = 'Calendar-date Article'
description = 'A concise description of the calendar-date article.'
date = 2026-07-12
draft = false`,
  },
  {
    name: "UTC timestamp article",
    metadata: `title = 'UTC Timestamp Article'
description = 'A concise description of the UTC timestamp article.'
date = 2026-07-12T15:00:00Z
draft = false`,
  },
  {
    name: "known numeric zero-offset article",
    metadata: `title = 'Known Numeric Zero-offset Article'
description = 'A concise description of the known numeric zero-offset article.'
date = 2026-07-12T15:00:00+00:00
draft = false`,
  },
  {
    name: "published article",
    metadata: `title = 'Published Article'
description = 'A concise description of the published article.'
date = 2026-07-12T10:00:00-05:00
draft = false`,
  },
  {
    name: "draft article",
    metadata: `title = 'Draft Article'
description = 'A concise description of the draft article.'
date = 2026-07-13T10:00:00-05:00
draft = true`,
  },
  {
    name: "future-dated article",
    metadata: `title = 'Future Article'
description = 'A concise description of the future article.'
date = 2099-01-01T10:00:00-06:00
draft = false`,
  },
  {
    name: "expired article",
    metadata: `title = 'Expired Article'
description = 'A concise description of the expired article.'
date = 2025-01-01T10:00:00-06:00
draft = false
expiryDate = 2026-01-01T10:00:00-06:00`,
  },
];

const INVALID_ARTICLE_FRONT_MATTER_FIXTURES = [
  {
    name: "missing title",
    metadata: `description = 'A concise article description.'
date = 2026-07-12
draft = false`,
    expectedError: "exactly one title",
  },
  {
    name: "duplicate title",
    metadata: `title = 'First Title'
title = 'Second Title'
description = 'A concise article description.'
date = 2026-07-12
draft = false`,
    expectedError: "exactly one title",
  },
  {
    name: "blank title",
    metadata: `title = '   '
description = 'A concise article description.'
date = 2026-07-12
draft = false`,
    expectedError: "nonblank title",
  },
  {
    name: "invalid date",
    metadata: `title = 'Invalid Date'
description = 'A concise article description.'
date = 'July 12, 2026'
draft = false`,
    expectedError: "valid calendar date or offset-qualified RFC 3339 timestamp",
  },
  {
    name: "impossible calendar date",
    metadata: `title = 'Impossible Calendar Date'
description = 'A concise article description.'
date = 2026-02-30
draft = false`,
    expectedError: "valid calendar date or offset-qualified RFC 3339 timestamp",
  },
  {
    name: "invalid publication time",
    metadata: `title = 'Invalid Publication Time'
description = 'A concise article description.'
date = 2026-07-12T24:00:00-05:00
draft = false`,
    expectedError: "valid calendar date or offset-qualified RFC 3339 timestamp",
  },
  {
    name: "invalid UTC offset",
    metadata: `title = 'Invalid UTC Offset'
description = 'A concise article description.'
date = 2026-07-12T10:00:00+14:01
draft = false`,
    expectedError: "valid calendar date or offset-qualified RFC 3339 timestamp",
  },
  {
    name: "offsetless publication timestamp",
    metadata: `title = 'Offsetless Publication Timestamp'
description = 'A concise article description.'
date = 2026-07-12T10:00:00
draft = false`,
    expectedError: "valid calendar date or offset-qualified RFC 3339 timestamp",
  },
  {
    name: "unknown local offset",
    metadata: `title = 'Unknown Local Offset'
description = 'A concise article description.'
date = 2026-07-12T10:00:00-00:00
draft = false`,
    expectedError: "valid calendar date or offset-qualified RFC 3339 timestamp",
  },
  {
    name: "date civil year differs from directory",
    sourcePath: "content/reflections/2025/directory_year_mismatch.md",
    metadata: `title = 'Directory Year Mismatch'
description = 'A concise article description.'
date = 2026-01-01
draft = false`,
    expectedError: "date civil year 2026 to match its 2025 directory",
  },
  {
    name: "missing date",
    metadata: `title = 'Missing Date'
description = 'A concise article description.'
draft = false`,
    expectedError: "exactly one date",
  },
  {
    name: "duplicate date",
    metadata: `title = 'Duplicate Date'
description = 'A concise article description.'
date = 2026-07-12
date = 2026-07-13
draft = false`,
    expectedError: "exactly one date",
  },
  {
    name: "non-Boolean draft",
    metadata: `title = 'Non-Boolean Draft'
description = 'A concise article description.'
date = 2026-07-12
draft = 'false'`,
    expectedError: "Boolean draft",
  },
  {
    name: "missing draft",
    metadata: `title = 'Missing Draft'
description = 'A concise article description.'
date = 2026-07-12`,
    expectedError: "exactly one draft",
  },
  {
    name: "duplicate draft",
    metadata: `title = 'Duplicate Draft'
description = 'A concise article description.'
date = 2026-07-12
draft = true
draft = false`,
    expectedError: "exactly one draft",
  },
  {
    name: "missing description",
    metadata: `title = 'Missing Description'
date = 2026-07-12
draft = false`,
    expectedError: "exactly one description",
  },
  {
    name: "blank description",
    metadata: `title = 'Blank Description'
description = '   '
date = 2026-07-12
draft = false`,
    expectedError: "nonblank description",
  },
  {
    name: "duplicate description",
    metadata: `title = 'Duplicate Description'
description = 'The first concise article description.'
description = 'The second concise article description.'
date = 2026-07-12
draft = false`,
    expectedError: "exactly one description",
  },
  {
    name: "description nested in a reading record",
    metadata: `title = 'Nested Description'
date = 2026-07-12
draft = false

[[readings]]
description = 'This belongs to the reading record, not the page.'`,
    expectedError: "exactly one description",
  },
];

module.exports = {
  ARTICLE_DESCRIPTION_BASELINE_PATHS,
  INVALID_ARTICLE_FRONT_MATTER_FIXTURES,
  VALID_ARTICLE_FRONT_MATTER_FIXTURES,
};

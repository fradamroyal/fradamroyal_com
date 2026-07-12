(function () {
  "use strict";

  const {
    VERSE_COUNTS,
    OMITTED_VERSE_MARKERS,
  } = require("./bible-reading-plan-versification.js");
  const {
    metadataFor: readingMetadataFor,
  } = require("./bible-reading-plan-reading-metadata.js");
  const { buildPlanExport } = require("./bible-reading-plan-exports.js");

  const MILLISECONDS_PER_DAY = 86_400_000;
  const PREVIEW_DAY_COUNT = 5;
  const OLD_TESTAMENT_BOOK_COUNT = 46;
  const GOSPEL_BOOK_COUNT = 4;
  // OT portions stay at chapter boundaries, so a corpus-density estimate keeps
  // their weights comparable with the NT word-count metadata without shipping text.
  const OLD_TESTAMENT_WORDS_PER_VERSE = 25;
  const PREFERRED_PARTITION_BEAM_WIDTH = 100;
  const PREFERRED_PARTITION_FALLBACK_BEAM_WIDTH = 400;
  const PREFERRED_PARTITION_CANDIDATE_RADIUS = 4;

  const PLAN_ORDERS = Object.freeze({
    CANONICAL: "canonical",
    PREFERRED: "preferred",
  });

  const PLAN_ORDER_LABELS = Object.freeze({
    [PLAN_ORDERS.CANONICAL]: "Canonical order",
    [PLAN_ORDERS.PREFERRED]: "Fr. Adam's preferred reading order",
  });

  // NABRE letters the Greek additions A-F; these spans translate their verse
  // numbers to the placement used by the Vulgate and many Catholic Bibles.
  const ESTHER_ADDITION_VULGATE_SPANS = Object.freeze({
    A: Object.freeze([
      Object.freeze({ first: 1, last: 11, chapter: 11, offset: 1 }),
      Object.freeze({ first: 12, last: 17, chapter: 12, offset: -11 }),
    ]),
    B: Object.freeze([
      Object.freeze({ first: 1, last: 7, chapter: 13, offset: 0 }),
    ]),
    C: Object.freeze([
      Object.freeze({ first: 1, last: 11, chapter: 13, offset: 7 }),
      Object.freeze({ first: 12, last: 30, chapter: 14, offset: -11 }),
    ]),
    D: Object.freeze([
      Object.freeze({ first: 1, last: 16, chapter: 15, offset: 3 }),
    ]),
    E: Object.freeze([
      Object.freeze({ first: 1, last: 24, chapter: 16, offset: 0 }),
    ]),
    F: Object.freeze([
      Object.freeze({ first: 1, last: 10, chapter: 10, offset: 3 }),
      Object.freeze({ first: 11, last: 11, chapter: 11, offset: -10 }),
    ]),
  });

  const BOOKS = [
    { name: "Genesis", abbr: "Gen", chapters: 50 },
    { name: "Exodus", abbr: "Exod", chapters: 40 },
    { name: "Leviticus", abbr: "Lev", chapters: 27 },
    { name: "Numbers", abbr: "Num", chapters: 36 },
    { name: "Deuteronomy", abbr: "Deut", chapters: 34 },
    { name: "Joshua", abbr: "Josh", chapters: 24 },
    { name: "Judges", abbr: "Judg", chapters: 21 },
    { name: "Ruth", abbr: "Ruth", chapters: 4 },
    { name: "1 Samuel", abbr: "1 Sam", chapters: 31 },
    { name: "2 Samuel", abbr: "2 Sam", chapters: 24 },
    { name: "1 Kings", abbr: "1 Kgs", chapters: 22 },
    { name: "2 Kings", abbr: "2 Kgs", chapters: 25 },
    { name: "1 Chronicles", abbr: "1 Chr", chapters: 29 },
    { name: "2 Chronicles", abbr: "2 Chr", chapters: 36 },
    { name: "Ezra", abbr: "Ezra", chapters: 10 },
    { name: "Nehemiah", abbr: "Neh", chapters: 13 },
    { name: "Tobit", abbr: "Tob", chapters: 14 },
    { name: "Judith", abbr: "Jdt", chapters: 16 },
    {
      name: "Esther",
      abbr: "Esth",
      units: ["A", 1, 2, 3, "B", 4, "C", "D", 5, 6, 7, 8, "E", 9, 10, "F"],
    },
    { name: "1 Maccabees", abbr: "1 Macc", chapters: 16 },
    { name: "2 Maccabees", abbr: "2 Macc", chapters: 15 },
    { name: "Job", abbr: "Job", chapters: 42 },
    { name: "Psalms", abbr: "Ps", rangeAbbr: "Pss", chapters: 150 },
    { name: "Proverbs", abbr: "Prov", chapters: 31 },
    { name: "Ecclesiastes", abbr: "Eccl", chapters: 12 },
    { name: "Song of Songs", abbr: "Song", chapters: 8 },
    { name: "Wisdom of Solomon", abbr: "Wis", chapters: 19 },
    { name: "Sirach", abbr: "Sir", chapters: 51 },
    { name: "Isaiah", abbr: "Isa", chapters: 66 },
    { name: "Jeremiah", abbr: "Jer", chapters: 52 },
    { name: "Lamentations", abbr: "Lam", chapters: 5 },
    { name: "Baruch", abbr: "Bar", chapters: 6 },
    { name: "Ezekiel", abbr: "Ezek", chapters: 48 },
    { name: "Daniel", abbr: "Dan", chapters: 14 },
    { name: "Hosea", abbr: "Hos", chapters: 14 },
    { name: "Joel", abbr: "Joel", chapters: 4 },
    { name: "Amos", abbr: "Amos", chapters: 9 },
    { name: "Obadiah", abbr: "Obad", chapters: 1 },
    { name: "Jonah", abbr: "Jonah", chapters: 4 },
    { name: "Micah", abbr: "Mic", chapters: 7 },
    { name: "Nahum", abbr: "Nah", chapters: 3 },
    { name: "Habakkuk", abbr: "Hab", chapters: 3 },
    { name: "Zephaniah", abbr: "Zeph", chapters: 3 },
    { name: "Haggai", abbr: "Hag", chapters: 2 },
    { name: "Zechariah", abbr: "Zech", chapters: 14 },
    { name: "Malachi", abbr: "Mal", chapters: 3 },
    { name: "Matthew", abbr: "Matt", chapters: 28 },
    { name: "Mark", abbr: "Mark", chapters: 16 },
    { name: "Luke", abbr: "Luke", chapters: 24 },
    { name: "John", abbr: "John", chapters: 21 },
    { name: "Acts of the Apostles", abbr: "Acts", chapters: 28 },
    { name: "Romans", abbr: "Rom", chapters: 16 },
    { name: "1 Corinthians", abbr: "1 Cor", chapters: 16 },
    { name: "2 Corinthians", abbr: "2 Cor", chapters: 13 },
    { name: "Galatians", abbr: "Gal", chapters: 6 },
    { name: "Ephesians", abbr: "Eph", chapters: 6 },
    { name: "Philippians", abbr: "Phil", chapters: 4 },
    { name: "Colossians", abbr: "Col", chapters: 4 },
    { name: "1 Thessalonians", abbr: "1 Thess", chapters: 5 },
    { name: "2 Thessalonians", abbr: "2 Thess", chapters: 3 },
    { name: "1 Timothy", abbr: "1 Tim", chapters: 6 },
    { name: "2 Timothy", abbr: "2 Tim", chapters: 4 },
    { name: "Titus", abbr: "Titus", chapters: 3 },
    { name: "Philemon", abbr: "Phlm", chapters: 1 },
    { name: "Hebrews", abbr: "Heb", chapters: 13 },
    { name: "James", abbr: "Jas", chapters: 5 },
    { name: "1 Peter", abbr: "1 Pet", chapters: 5 },
    { name: "2 Peter", abbr: "2 Pet", chapters: 3 },
    { name: "1 John", abbr: "1 John", chapters: 5 },
    { name: "2 John", abbr: "2 John", chapters: 1 },
    { name: "3 John", abbr: "3 John", chapters: 1 },
    { name: "Jude", abbr: "Jude", chapters: 1 },
    { name: "Revelation", abbr: "Rev", chapters: 22 },
  ];

  const BOOK_LABELS = BOOKS.map((book) =>
    book.units || Array.from({ length: book.chapters }, (_, index) => index + 1),
  );

  const CANON_UNITS = BOOKS.flatMap((book, bookIndex) => {
    const labels = BOOK_LABELS[bookIndex];

    return labels.map((label) =>
      Object.freeze({
        id: `${bookIndex}:${label}`,
        bookIndex,
        bookName: book.name,
        abbr: book.abbr,
        rangeAbbr: book.rangeAbbr,
        label,
        testament: bookIndex < OLD_TESTAMENT_BOOK_COUNT ? "OT" : "NT",
      }),
    );
  });

  const MAX_DAYS = CANON_UNITS.length;

  const PREFERRED_TRACKS = Object.freeze([
    Object.freeze({
      id: "old-testament",
      label: "Old Testament",
      firstBookIndex: 0,
      lastBookIndex: OLD_TESTAMENT_BOOK_COUNT - 1,
    }),
    Object.freeze({
      id: "gospel",
      label: "Gospel",
      firstBookIndex: OLD_TESTAMENT_BOOK_COUNT,
      lastBookIndex: OLD_TESTAMENT_BOOK_COUNT + GOSPEL_BOOK_COUNT - 1,
    }),
    Object.freeze({
      id: "new-testament",
      label: "New Testament (Acts–Revelation)",
      firstBookIndex: OLD_TESTAMENT_BOOK_COUNT + GOSPEL_BOOK_COUNT,
      lastBookIndex: BOOKS.length - 1,
    }),
  ]);

  function omittedVersesFor(bookIndex, label) {
    return OMITTED_VERSE_MARKERS[`${bookIndex}:${label}`] || [];
  }

  function trackForBookIndex(bookIndex) {
    return PREFERRED_TRACKS.find(
      (track) => bookIndex >= track.firstBookIndex && bookIndex <= track.lastBookIndex,
    );
  }

  const verseTrackTotals = {
    "old-testament": 0,
    gospel: 0,
    "new-testament": 0,
  };

  BOOKS.forEach((book, bookIndex) => {
    if (!VERSE_COUNTS[bookIndex] || VERSE_COUNTS[bookIndex].length !== BOOK_LABELS[bookIndex].length) {
      throw new Error(`Verse-count data does not match ${book.name}.`);
    }

    const total = VERSE_COUNTS[bookIndex].reduce(
      (sum, maximum, chapterIndex) =>
        sum + maximum - omittedVersesFor(bookIndex, BOOK_LABELS[bookIndex][chapterIndex]).length,
      0,
    );
    verseTrackTotals[trackForBookIndex(bookIndex).id] += total;
  });

  const VERSE_TRACK_TOTALS = Object.freeze(verseTrackTotals);
  const PREFERRED_MAX_DAYS = Math.min(
    VERSE_TRACK_TOTALS.gospel,
    VERSE_TRACK_TOTALS["new-testament"] - VERSE_TRACK_TOTALS.gospel,
    VERSE_TRACK_TOTALS["old-testament"] - VERSE_TRACK_TOTALS["new-testament"],
  );

  let verseTracksCache = null;
  let senseTracksCache = null;

  function parseCivilDate(value) {
    if (typeof value !== "string") {
      return null;
    }

    const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date.getTime();
  }

  function formatCivilDate(timestamp) {
    const date = new Date(timestamp);
    const year = String(date.getUTCFullYear()).padStart(4, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addCivilDays(value, numberOfDays) {
    const timestamp = parseCivilDate(value);
    if (timestamp === null || !Number.isInteger(numberOfDays)) {
      throw new TypeError("A valid civil date and an integer day count are required.");
    }

    return formatCivilDate(timestamp + numberOfDays * MILLISECONDS_PER_DAY);
  }

  function inclusiveDayCount(startValue, endValue) {
    const start = parseCivilDate(startValue);
    const end = parseCivilDate(endValue);
    if (start === null || end === null) {
      throw new TypeError("Valid start and end dates are required.");
    }

    return Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;
  }

  function partitionCanon(totalDays) {
    if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > MAX_DAYS) {
      throw new RangeError(`The plan must contain between 1 and ${MAX_DAYS} days.`);
    }

    return Array.from({ length: totalDays }, (_, dayIndex) => {
      const start = Math.floor((dayIndex * MAX_DAYS) / totalDays);
      const end = Math.floor(((dayIndex + 1) * MAX_DAYS) / totalDays);
      return CANON_UNITS.slice(start, end);
    });
  }

  function getVerseTracks() {
    if (verseTracksCache !== null) {
      return verseTracksCache;
    }

    const tracks = Object.fromEntries(PREFERRED_TRACKS.map((track) => [track.id, []]));

    BOOKS.forEach((book, bookIndex) => {
      const track = trackForBookIndex(bookIndex);

      BOOK_LABELS[bookIndex].forEach((label, chapterIndex) => {
        const maximum = VERSE_COUNTS[bookIndex][chapterIndex];
        const omitted = new Set(omittedVersesFor(bookIndex, label));

        for (let verse = 1; verse <= maximum; verse += 1) {
          if (omitted.has(verse)) {
            continue;
          }

          const units = tracks[track.id];
          const previous = units.at(-1);
          const beginsChapter =
            previous === undefined ||
            previous.bookIndex !== bookIndex ||
            previous.chapterIndex !== chapterIndex;
          const isProtectedMatthewGenealogyBoundary =
            bookIndex === OLD_TESTAMENT_BOOK_COUNT &&
            label === 1 &&
            verse > 1 &&
            verse < 18;
          const isProtectedJohnAdulterousWomanBoundary =
            bookIndex === OLD_TESTAMENT_BOOK_COUNT + GOSPEL_BOOK_COUNT - 1 &&
            label === 8 &&
            verse >= 2 &&
            verse <= 11;
          const isPsalm119Stanza =
            bookIndex === 22 && label === 119 && (verse - 1) % 8 === 0;
          const isNumbers26Continuation =
            bookIndex === 3 && label === 26 && verse === 1;
          const readingMetadata =
            bookIndex >= OLD_TESTAMENT_BOOK_COUNT
              ? readingMetadataFor(bookIndex, Number(label), verse)
              : null;

          if (
            bookIndex >= OLD_TESTAMENT_BOOK_COUNT &&
            (!readingMetadata || readingMetadata.wordCount <= 0)
          ) {
            throw new Error(`Reading-length data is missing for ${book.abbr} ${label}:${verse}.`);
          }

          const senseUnitStart =
            track.id === "old-testament"
              ? (beginsChapter || isPsalm119Stanza) && !isNumbers26Continuation
              : (previous === undefined ||
                  previous.bookIndex !== bookIndex ||
                  readingMetadata.paragraphStart) &&
                !isProtectedMatthewGenealogyBoundary &&
                !isProtectedJohnAdulterousWomanBoundary;

          units.push(
            Object.freeze({
              id: `${bookIndex}:${label}:${verse}`,
              bookIndex,
              bookName: book.name,
              abbr: book.abbr,
              rangeAbbr: book.rangeAbbr,
              label,
              chapterIndex,
              verse,
              track: track.id,
              wordCount:
                readingMetadata?.wordCount || OLD_TESTAMENT_WORDS_PER_VERSE,
              senseUnitStart,
            }),
          );
        }
      });
    });

    verseTracksCache = Object.freeze(
      Object.fromEntries(
        Object.entries(tracks).map(([track, units]) => [track, Object.freeze(units)]),
      ),
    );
    return verseTracksCache;
  }

  function getSenseTracks() {
    if (senseTracksCache !== null) {
      return senseTracksCache;
    }

    const verseTracks = getVerseTracks();
    senseTracksCache = Object.freeze(
      Object.fromEntries(
        Object.entries(verseTracks).map(([track, units]) => {
          const boundaries = [0];
          const prefixWords = [0];

          units.forEach((unit, index) => {
            prefixWords.push(prefixWords.at(-1) + unit.wordCount);
            if (index > 0 && unit.senseUnitStart) {
              boundaries.push(index);
            }
          });
          boundaries.push(units.length);

          const maximumAtomWords = Math.max(
            ...boundaries.slice(1).map(
              (boundary, index) =>
                prefixWords[boundary] - prefixWords[boundaries[index]],
            ),
          );

          return [
            track,
            Object.freeze({
              units,
              boundaries: Object.freeze(boundaries),
              prefixWords: Object.freeze(prefixWords),
              totalWords: prefixWords.at(-1),
              maximumAtomWords,
            }),
          ];
        }),
      ),
    );
    return senseTracksCache;
  }

  function pairedGospelAndNewTestamentPartition(
    totalDays,
    beamWidth = PREFERRED_PARTITION_BEAM_WIDTH,
  ) {
    const tracks = getSenseTracks();
    const gospel = tracks.gospel;
    const newTestament = tracks["new-testament"];
    const gospelAtomCount = gospel.boundaries.length - 1;
    const newTestamentAtomCount = newTestament.boundaries.length - 1;
    const gospelTarget = gospel.totalWords / totalDays;
    const newTestamentTarget = newTestament.totalWords / totalDays;
    const gospelMaximum = Math.max(
      gospelTarget * 3,
      gospel.maximumAtomWords * 2,
    );
    const newTestamentMaximum = Math.max(
      newTestamentTarget * 3,
      newTestament.maximumAtomWords * 2,
    );
    let states = [
      {
        gospelIndex: 0,
        newTestamentIndex: 0,
        cost: 0,
        parent: null,
        gospelWords: 0,
        newTestamentWords: 0,
      },
    ];

    function candidateEndIndexes(
      senseTrack,
      atomCount,
      startIndex,
      remainingDays,
      targetWords,
      minimumWords,
    ) {
      if (remainingDays === 0) {
        return [atomCount];
      }

      const firstEndIndex = startIndex + 1;
      const lastEndIndex = atomCount - remainingDays;
      const desiredPrefix =
        senseTrack.prefixWords[senseTrack.boundaries[startIndex]] +
        Math.max(targetWords, minimumWords);
      let low = firstEndIndex;
      let high = lastEndIndex;

      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (
          senseTrack.prefixWords[senseTrack.boundaries[middle]] < desiredPrefix
        ) {
          low = middle + 1;
        } else {
          high = middle;
        }
      }

      const indexes = new Set([firstEndIndex, lastEndIndex]);
      for (
        let index = low - PREFERRED_PARTITION_CANDIDATE_RADIUS;
        index <= low + PREFERRED_PARTITION_CANDIDATE_RADIUS;
        index += 1
      ) {
        if (index >= firstEndIndex && index <= lastEndIndex) {
          indexes.add(index);
        }
      }
      return Array.from(indexes).sort((left, right) => left - right);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const remainingDays = totalDays - day;
      const finalDay = remainingDays === 0;
      const nextByPosition = new Map();

      states.forEach((state) => {
        const gospelIndexes = candidateEndIndexes(
          gospel,
          gospelAtomCount,
          state.gospelIndex,
          remainingDays,
          gospelTarget,
          1,
        );

        gospelIndexes.forEach((gospelIndex) => {
          const gospelWords =
            gospel.prefixWords[gospel.boundaries[gospelIndex]] -
            gospel.prefixWords[gospel.boundaries[state.gospelIndex]];
          if (!finalDay && gospelWords > gospelMaximum) {
            return;
          }
          if (
            gospel.totalWords - gospel.prefixWords[gospel.boundaries[gospelIndex]] >
            remainingDays * gospelMaximum
          ) {
            return;
          }

          const newTestamentIndexes = candidateEndIndexes(
            newTestament,
            newTestamentAtomCount,
            state.newTestamentIndex,
            remainingDays,
            newTestamentTarget,
            gospelWords + 1,
          );

          newTestamentIndexes.forEach((newTestamentIndex) => {
            const newTestamentWords =
              newTestament.prefixWords[
                newTestament.boundaries[newTestamentIndex]
              ] -
              newTestament.prefixWords[
                newTestament.boundaries[state.newTestamentIndex]
              ];
            if (!finalDay && newTestamentWords > newTestamentMaximum) {
              return;
            }
            if (
              newTestament.totalWords -
                  newTestament.prefixWords[
                    newTestament.boundaries[newTestamentIndex]
                  ] >
                remainingDays * newTestamentMaximum ||
              newTestamentWords <= gospelWords
            ) {
              return;
            }

            const gospelDeviation = (gospelWords - gospelTarget) / gospelTarget;
            const newTestamentDeviation =
              (newTestamentWords - newTestamentTarget) / newTestamentTarget;
            const gospelCumulativeDeviation =
              (gospel.prefixWords[gospel.boundaries[gospelIndex]] -
                day * gospelTarget) /
              gospelTarget;
            const newTestamentCumulativeDeviation =
              (newTestament.prefixWords[
                newTestament.boundaries[newTestamentIndex]
              ] -
                day * newTestamentTarget) /
              newTestamentTarget;
            const cost =
              state.cost +
              gospelDeviation * gospelDeviation +
              newTestamentDeviation * newTestamentDeviation +
              0.02 *
                (gospelCumulativeDeviation * gospelCumulativeDeviation +
                  newTestamentCumulativeDeviation *
                    newTestamentCumulativeDeviation);
            const key =
              gospelIndex * (newTestamentAtomCount + 1) + newTestamentIndex;
            const current = nextByPosition.get(key);

            if (!current || cost < current.cost) {
              nextByPosition.set(key, {
                gospelIndex,
                newTestamentIndex,
                cost,
                parent: state,
                gospelWords,
                newTestamentWords,
              });
            }
          });
        });
      });

      states = Array.from(nextByPosition.values())
        .sort((left, right) => left.cost - right.cost)
        .slice(0, beamWidth);
      if (states.length === 0) {
        return null;
      }
    }

    let state = states.find(
      (candidate) =>
        candidate.gospelIndex === gospelAtomCount &&
        candidate.newTestamentIndex === newTestamentAtomCount,
    );
    if (!state) {
      return null;
    }

    const gospelCuts = [gospel.units.length];
    const newTestamentCuts = [newTestament.units.length];
    const gospelWords = [];
    const newTestamentWords = [];

    while (state.parent) {
      gospelWords.push(state.gospelWords);
      newTestamentWords.push(state.newTestamentWords);
      gospelCuts.push(gospel.boundaries[state.parent.gospelIndex]);
      newTestamentCuts.push(
        newTestament.boundaries[state.parent.newTestamentIndex],
      );
      state = state.parent;
    }

    return {
      gospelCuts: gospelCuts.reverse(),
      newTestamentCuts: newTestamentCuts.reverse(),
      gospelWords: gospelWords.reverse(),
      newTestamentWords: newTestamentWords.reverse(),
    };
  }

  function constrainedSensePartition(track, totalDays, lowerWordCounts) {
    const senseTrack = getSenseTracks()[track];
    const boundaries = senseTrack.boundaries;
    const atomCount = boundaries.length - 1;
    const target = senseTrack.totalWords / totalDays;
    let previousCosts = new Float64Array(atomCount + 1);
    previousCosts.fill(Number.POSITIVE_INFINITY);
    previousCosts[0] = 0;
    const parents = Array.from({ length: totalDays + 1 }, () => {
      const entries = new Int32Array(atomCount + 1);
      entries.fill(-1);
      return entries;
    });

    for (let day = 1; day <= totalDays; day += 1) {
      const minimumWords = lowerWordCounts[day - 1] + 1;
      const maximumWords = Math.max(
        Math.ceil(target * 3),
        minimumWords + senseTrack.maximumAtomWords * 2,
      );
      const nextCosts = new Float64Array(atomCount + 1);
      nextCosts.fill(Number.POSITIVE_INFINITY);
      const firstEndIndex = day;
      const lastEndIndex = atomCount - (totalDays - day);

      for (
        let endIndex = firstEndIndex;
        endIndex <= lastEndIndex;
        endIndex += 1
      ) {
        for (
          let startIndex = endIndex - 1;
          startIndex >= day - 1;
          startIndex -= 1
        ) {
          const words =
            senseTrack.prefixWords[boundaries[endIndex]] -
            senseTrack.prefixWords[boundaries[startIndex]];
          if (words > maximumWords) {
            break;
          }
          if (
            words < minimumWords ||
            !Number.isFinite(previousCosts[startIndex])
          ) {
            continue;
          }

          const deviation = (words - target) / target;
          const cost = previousCosts[startIndex] + deviation * deviation;
          if (cost < nextCosts[endIndex]) {
            nextCosts[endIndex] = cost;
            parents[day][endIndex] = startIndex;
          }
        }
      }
      previousCosts = nextCosts;
    }

    if (!Number.isFinite(previousCosts[atomCount])) {
      return null;
    }

    const cuts = new Array(totalDays + 1);
    const wordCounts = new Array(totalDays);
    let endIndex = atomCount;
    cuts[totalDays] = boundaries[atomCount];

    for (let day = totalDays; day >= 1; day -= 1) {
      const startIndex = parents[day][endIndex];
      if (startIndex < 0) {
        return null;
      }
      cuts[day - 1] = boundaries[startIndex];
      wordCounts[day - 1] =
        senseTrack.prefixWords[boundaries[endIndex]] -
        senseTrack.prefixWords[boundaries[startIndex]];
      endIndex = startIndex;
    }

    return { cuts, wordCounts };
  }

  function sliceByCuts(units, cuts) {
    return cuts
      .slice(1)
      .map((end, index) => units.slice(cuts[index], end));
  }

  function partitionPreferred(totalDays) {
    if (
      !Number.isInteger(totalDays) ||
      totalDays < 1 ||
      totalDays > PREFERRED_MAX_DAYS
    ) {
      throw new RangeError(
        `The preferred-order plan must contain between 1 and ${PREFERRED_MAX_DAYS} days.`,
      );
    }

    const tracks = getVerseTracks();
    const pairedPartition =
      pairedGospelAndNewTestamentPartition(totalDays) ||
      pairedGospelAndNewTestamentPartition(
        totalDays,
        PREFERRED_PARTITION_FALLBACK_BEAM_WIDTH,
      );
    if (!pairedPartition) {
      throw new RangeError(
        `No sense-unit reading plan is available for ${totalDays} days.`,
      );
    }
    const oldTestamentPartition = constrainedSensePartition(
      "old-testament",
      totalDays,
      pairedPartition.newTestamentWords,
    );
    if (!oldTestamentPartition) {
      throw new RangeError(
        `No sense-unit reading plan is available for ${totalDays} days.`,
      );
    }
    const slices = {
      "old-testament": sliceByCuts(
        tracks["old-testament"],
        oldTestamentPartition.cuts,
      ),
      gospel: sliceByCuts(tracks.gospel, pairedPartition.gospelCuts),
      "new-testament": sliceByCuts(
        tracks["new-testament"],
        pairedPartition.newTestamentCuts,
      ),
    };
    const wordCounts = {
      "old-testament": oldTestamentPartition.wordCounts,
      gospel: pairedPartition.gospelWords,
      "new-testament": pairedPartition.newTestamentWords,
    };

    return Array.from({ length: totalDays }, (_, dayIndex) =>
      PREFERRED_TRACKS.map((track) => ({
        track: track.id,
        label: track.label,
        units: slices[track.id][dayIndex],
        estimatedWords: wordCounts[track.id][dayIndex],
      })),
    );
  }

  function maxDaysForOrder(order) {
    if (order === PLAN_ORDERS.CANONICAL) {
      return MAX_DAYS;
    }
    if (order === PLAN_ORDERS.PREFERRED) {
      return PREFERRED_MAX_DAYS;
    }
    throw new RangeError(`Unknown reading order: ${String(order)}.`);
  }

  function formatNumericRange(book, units) {
    const first = units[0].label;
    const last = units[units.length - 1].label;
    const abbreviation = units.length > 1 && book.rangeAbbr ? book.rangeAbbr : book.abbr;
    const range = first === last ? String(first) : `${first}–${last}`;
    return `${abbreviation} ${range}`;
  }

  function mapEstherAdditionVerse(label, verse) {
    const span = ESTHER_ADDITION_VULGATE_SPANS[label]?.find(
      (candidate) => verse >= candidate.first && verse <= candidate.last,
    );

    if (!span) {
      throw new RangeError(`No Vulgate numbering is available for Esth ${label}:${verse}.`);
    }

    return {
      chapter: span.chapter,
      verse: verse + span.offset,
    };
  }

  function formatEstherAdditionCitation(book, label, firstVerse, lastVerse) {
    const spans = ESTHER_ADDITION_VULGATE_SPANS[label];
    const fullAddition = firstVerse === undefined && lastVerse === undefined;
    const additionReference = fullAddition
      ? label
      : `${label}:${
          firstVerse === lastVerse ? String(firstVerse) : `${firstVerse}–${lastVerse}`
        }`;

    if (!spans) {
      return `${book.abbr} ${additionReference}`;
    }

    const resolvedFirstVerse = fullAddition ? spans[0].first : firstVerse;
    const resolvedLastVerse = fullAddition ? spans.at(-1).last : lastVerse;
    const firstVulgate = mapEstherAdditionVerse(label, resolvedFirstVerse);
    const lastVulgate = mapEstherAdditionVerse(label, resolvedLastVerse);
    const vulgateRange =
      firstVulgate.chapter === lastVulgate.chapter
        ? `${firstVulgate.chapter}:${
            firstVulgate.verse === lastVulgate.verse
              ? firstVulgate.verse
              : `${firstVulgate.verse}–${lastVulgate.verse}`
          }`
        : `${firstVulgate.chapter}:${firstVulgate.verse}–${lastVulgate.chapter}:${lastVulgate.verse}`;

    return `${book.abbr} ${additionReference} (${vulgateRange})`;
  }

  function formatCitations(units) {
    const citations = [];
    let index = 0;

    while (index < units.length) {
      const first = units[index];
      const book = BOOKS[first.bookIndex];

      if (typeof first.label === "string") {
        citations.push(formatEstherAdditionCitation(book, first.label));
        index += 1;
        continue;
      }

      const run = [first];
      index += 1;

      while (
        index < units.length &&
        units[index].bookIndex === first.bookIndex &&
        typeof units[index].label === "number" &&
        units[index].label === run[run.length - 1].label + 1
      ) {
        run.push(units[index]);
        index += 1;
      }

      citations.push(formatNumericRange(book, run));
    }

    return citations;
  }

  function formatVerseCitations(units) {
    if (units.length === 0) {
      return [];
    }

    const segments = [];
    let index = 0;

    while (index < units.length) {
      const first = units[index];
      const segmentUnits = [first];
      index += 1;

      while (
        index < units.length &&
        units[index].bookIndex === first.bookIndex &&
        units[index].chapterIndex === first.chapterIndex
      ) {
        segmentUnits.push(units[index]);
        index += 1;
      }

      const availableVerseCount =
        VERSE_COUNTS[first.bookIndex][first.chapterIndex] -
        omittedVersesFor(first.bookIndex, first.label).length;
      segments.push({
        bookIndex: first.bookIndex,
        label: first.label,
        firstVerse: first.verse,
        lastVerse: segmentUnits.at(-1).verse,
        fullChapter: segmentUnits.length === availableVerseCount,
      });
    }

    const citations = [];
    index = 0;

    while (index < segments.length) {
      const segment = segments[index];
      const book = BOOKS[segment.bookIndex];

      if (segment.fullChapter && typeof segment.label === "number") {
        const run = [{ label: segment.label }];
        index += 1;

        while (
          index < segments.length &&
          segments[index].fullChapter &&
          segments[index].bookIndex === segment.bookIndex &&
          typeof segments[index].label === "number" &&
          segments[index].label === run.at(-1).label + 1
        ) {
          run.push({ label: segments[index].label });
          index += 1;
        }

        citations.push(formatNumericRange(book, run));
        continue;
      }

      if (segment.fullChapter) {
        citations.push(formatEstherAdditionCitation(book, segment.label));
      } else {
        const verseRange =
          segment.firstVerse === segment.lastVerse
            ? String(segment.firstVerse)
            : `${segment.firstVerse}–${segment.lastVerse}`;
        citations.push(
          typeof segment.label === "string"
            ? formatEstherAdditionCitation(
                book,
                segment.label,
                segment.firstVerse,
                segment.lastVerse,
              )
            : `${book.abbr} ${segment.label}:${verseRange}`,
        );
      }
      index += 1;
    }

    return citations;
  }

  function buildPlan(startDate, totalDays, order = PLAN_ORDERS.CANONICAL) {
    if (parseCivilDate(startDate) === null) {
      throw new TypeError("A valid start date is required.");
    }

    maxDaysForOrder(order);

    if (order === PLAN_ORDERS.CANONICAL) {
      return partitionCanon(totalDays).map((units, index) => {
        const citations = formatCitations(units);
        return {
          day: index + 1,
          date: addCivilDays(startDate, index),
          order,
          units,
          citations,
          readings: [{ track: "canonical", label: "Reading", units, citations }],
        };
      });
    }

    return partitionPreferred(totalDays).map((groups, index) => {
      const readings = groups.map((group) => ({
        ...group,
        citations: formatVerseCitations(group.units),
      }));

      return {
        day: index + 1,
        date: addCivilDays(startDate, index),
        order,
        readings,
        units: readings.flatMap((reading) => reading.units),
        citations: readings.flatMap((reading) => reading.citations),
      };
    });
  }

  function previewPlan(plan, maximumDays = PREVIEW_DAY_COUNT) {
    if (!Array.isArray(plan)) {
      throw new TypeError("A reading plan array is required.");
    }
    if (!Number.isInteger(maximumDays) || maximumDays < 1) {
      throw new RangeError("The preview length must be a positive whole number.");
    }
    return plan.slice(0, maximumDays);
  }

  const api = Object.freeze({
    BOOKS,
    CANON_UNITS,
    MAX_DAYS,
    PLAN_ORDERS,
    PLAN_ORDER_LABELS,
    PREFERRED_TRACKS,
    VERSE_TRACK_TOTALS,
    PREFERRED_MAX_DAYS,
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
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document === "undefined") {
    return;
  }

  const form = document.querySelector("#bible-reading-plan-form");
  if (!form) {
    return;
  }

  const startInput = document.querySelector("#reading-plan-start-date");
  const endInput = document.querySelector("#reading-plan-end-date");
  const daysInput = document.querySelector("#reading-plan-total-days");
  const daysHelp = document.querySelector("#reading-plan-days-help");
  const endHelp = document.querySelector("#reading-plan-end-help");
  const endPanel = document.querySelector("#reading-plan-end-panel");
  const daysPanel = document.querySelector("#reading-plan-days-panel");
  const errorBox = document.querySelector("#reading-plan-form-error");
  const status = document.querySelector("#reading-plan-status");
  const results = document.querySelector("#reading-plan-results");
  const resultsHeading = document.querySelector("#reading-plan-results-heading");
  const resultsSummary = document.querySelector("#reading-plan-summary");
  const downloads = document.querySelector("#reading-plan-downloads");
  const previewNote = document.querySelector("#reading-plan-preview-note");
  const resultsList = document.querySelector("#reading-plan-days");
  const downloadButtons = Array.from(
    results.querySelectorAll("[data-export-format]"),
  );
  const modeInputs = Array.from(form.querySelectorAll('input[name="duration-mode"]'));
  const orderInputs = Array.from(form.querySelectorAll('input[name="reading-order"]'));
  let generatedPlan = null;

  const longDateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  function todayAsCivilDate() {
    const today = new Date();
    const year = String(today.getFullYear()).padStart(4, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatLongDate(value) {
    const timestamp = parseCivilDate(value);
    return timestamp === null ? value : longDateFormatter.format(new Date(timestamp));
  }

  function selectedMode() {
    return modeInputs.find((input) => input.checked)?.value || "days";
  }

  function selectedOrder() {
    return orderInputs.find((input) => input.checked)?.value || PLAN_ORDERS.CANONICAL;
  }

  function currentMaxDays() {
    return maxDaysForOrder(selectedOrder());
  }

  function clearValidation() {
    errorBox.hidden = true;
    errorBox.textContent = "";
    [startInput, endInput, daysInput].forEach((input) => input.removeAttribute("aria-invalid"));
  }

  function showValidationError(message, input) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.focus();
  }

  function clearResults() {
    generatedPlan = null;
    results.hidden = true;
    downloads.hidden = true;
    resultsHeading.textContent = "";
    resultsSummary.textContent = "";
    previewNote.textContent = "";
    resultsList.replaceChildren();
    status.textContent = "";
  }

  function updateOrderLimits(preserveValues = false) {
    const maximumDays = currentMaxDays();
    const formattedMaximum = maximumDays.toLocaleString();
    daysInput.max = String(maximumDays);
    daysHelp.textContent = `Choose from 1 to ${formattedMaximum} days for this reading order.`;
    endHelp.textContent = `The ending date counts as a reading day. Plans can span up to ${formattedMaximum} days for this reading order.`;
    updateEndDateBounds(!preserveValues);
  }

  function updateEndDateBounds(resetInvalidValue = true) {
    if (parseCivilDate(startInput.value) === null) {
      endInput.removeAttribute("min");
      endInput.removeAttribute("max");
      return;
    }

    const maximumDays = currentMaxDays();
    const maximumEndDate = addCivilDays(startInput.value, maximumDays - 1);
    endInput.min = startInput.value;
    endInput.max = maximumEndDate;

    if (
      resetInvalidValue &&
      (parseCivilDate(endInput.value) === null ||
        endInput.value < endInput.min ||
        endInput.value > endInput.max)
    ) {
      endInput.value = addCivilDays(startInput.value, Math.min(364, maximumDays - 1));
    }
  }

  function synchronizeMode() {
    const useEndDate = selectedMode() === "end-date";
    endPanel.hidden = !useEndDate;
    endInput.disabled = !useEndDate;
    endInput.required = useEndDate;
    daysPanel.hidden = useEndDate;
    daysInput.disabled = useEndDate;
    daysInput.required = !useEndDate;
    clearValidation();
  }

  function createCitationList(citations) {
    const list = document.createElement("ul");
    list.className = "reading-plan-readings";
    citations.forEach((citation) => {
      const item = document.createElement("li");
      item.textContent = citation;
      list.append(item);
    });
    return list;
  }

  function renderPlan(plan, startDate, endDate, order) {
    const fragment = document.createDocumentFragment();
    const preview = previewPlan(plan);

    preview.forEach((entry) => {
      const day = document.createElement("li");
      day.className = "reading-plan-day";

      const heading = document.createElement("h3");
      const time = document.createElement("time");
      time.dateTime = entry.date;
      time.textContent = formatLongDate(entry.date);
      heading.append(`Day ${entry.day} — `, time);

      day.append(heading);

      if (order === PLAN_ORDERS.PREFERRED) {
        const groups = document.createElement("ul");
        groups.className = "reading-plan-reading-groups";

        entry.readings.forEach((reading) => {
          const group = document.createElement("li");
          group.className = "reading-plan-reading-group";

          const label = document.createElement("span");
          label.className = "reading-plan-reading-label";
          label.textContent = reading.label;
          group.append(label, createCitationList(reading.citations));
          groups.append(group);
        });

        day.append(groups);
      } else {
        day.append(createCitationList(entry.citations));
      }
      fragment.append(day);
    });

    const orderLabel = PLAN_ORDER_LABELS[order];
    resultsHeading.textContent = `Your ${plan.length.toLocaleString()}-day reading plan — ${orderLabel}`;
    resultsSummary.textContent =
      order === PLAN_ORDERS.PREFERRED
        ? `${formatLongDate(startDate)} through ${formatLongDate(endDate)}. Each day includes Old Testament, Gospel, and New Testament readings. The full 73-book Catholic canon is scheduled once, with estimated reading lengths balanced at chapter or paragraph boundaries.`
        : `${formatLongDate(startDate)} through ${formatLongDate(endDate)}. The full 73-book Catholic canon is scheduled in order without splitting chapters.`;
    previewNote.textContent =
      preview.length < plan.length
        ? `Showing the first ${preview.length.toLocaleString()} of ${plan.length.toLocaleString()} days so you can verify the schedule. Download the complete plan above.`
        : `Showing all ${plan.length.toLocaleString()} days. Download the complete plan above.`;
    resultsList.replaceChildren(fragment);
    generatedPlan = plan;
    results.hidden = false;
    downloads.hidden = false;
    status.textContent = `Generated a ${plan.length.toLocaleString()}-day ${orderLabel} plan. The complete plan is ready to download.`;
    resultsHeading.focus();
  }

  function downloadExport(exportFile) {
    const blob = new Blob([exportFile.data], { type: exportFile.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFile.filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  startInput.value = todayAsCivilDate();
  updateOrderLimits();
  synchronizeMode();
  form.hidden = false;

  [startInput, endInput, daysInput].forEach((input) =>
    input.addEventListener("input", () => {
      clearValidation();
      clearResults();
    }),
  );
  startInput.addEventListener("change", () => updateEndDateBounds());
  modeInputs.forEach((input) =>
    input.addEventListener("change", () => {
      synchronizeMode();
      clearResults();
    }),
  );
  orderInputs.forEach((input) =>
    input.addEventListener("change", () => {
      clearValidation();
      clearResults();
      updateOrderLimits(true);
      status.textContent = `${PLAN_ORDER_LABELS[selectedOrder()]} selected. Choose up to ${currentMaxDays().toLocaleString()} days.`;
    }),
  );
  downloadButtons.forEach((button) =>
    button.addEventListener("click", () => {
      if (generatedPlan === null) {
        return;
      }

      const format = button.dataset.exportFormat;
      try {
        const orderLabel = PLAN_ORDER_LABELS[generatedPlan[0].order];
        downloadExport(
          buildPlanExport(generatedPlan, format, {
            title: `${orderLabel} Bible Reading Plan`,
          }),
        );
        status.textContent = `Prepared the complete ${format === "markdown" ? "Markdown" : format.toUpperCase()} plan for download.`;
      } catch {
        status.textContent = "The download could not be prepared. Please generate the plan again.";
      }
    }),
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearValidation();
    clearResults();

    if (parseCivilDate(startInput.value) === null) {
      showValidationError("Choose a valid start date.", startInput);
      return;
    }

    const order = selectedOrder();
    const maximumDays = maxDaysForOrder(order);
    let totalDays;
    let endDate;

    if (selectedMode() === "end-date") {
      if (parseCivilDate(endInput.value) === null) {
        showValidationError("Choose a valid ending date.", endInput);
        return;
      }

      totalDays = inclusiveDayCount(startInput.value, endInput.value);
      if (totalDays < 1) {
        showValidationError("The ending date must be on or after the start date.", endInput);
        return;
      }
      if (totalDays > maximumDays) {
        showValidationError(
          `Choose a plan of no more than ${maximumDays.toLocaleString()} days for this reading order.`,
          endInput,
        );
        return;
      }

      endDate = endInput.value;
    } else {
      const rawDays = daysInput.value.trim();
      totalDays = Number(rawDays);
      if (
        !/^\d+$/.test(rawDays) ||
        !Number.isInteger(totalDays) ||
        totalDays < 1 ||
        totalDays > maximumDays
      ) {
        showValidationError(
          `Enter a whole number from 1 to ${maximumDays.toLocaleString()} for this reading order.`,
          daysInput,
        );
        return;
      }

      endDate = addCivilDays(startInput.value, totalDays - 1);
    }

    renderPlan(
      buildPlan(startInput.value, totalDays, order),
      startInput.value,
      endDate,
      order,
    );
  });
})();

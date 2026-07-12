(function () {
  "use strict";

  const MILLISECONDS_PER_DAY = 86_400_000;
  const OLD_TESTAMENT_BOOK_COUNT = 46;

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

  const CANON_UNITS = BOOKS.flatMap((book, bookIndex) => {
    const labels = book.units || Array.from({ length: book.chapters }, (_, index) => index + 1);

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

  function formatNumericRange(book, units) {
    const first = units[0].label;
    const last = units[units.length - 1].label;
    const abbreviation = units.length > 1 && book.rangeAbbr ? book.rangeAbbr : book.abbr;
    const range = first === last ? String(first) : `${first}–${last}`;
    return `${abbreviation} ${range}`;
  }

  function formatCitations(units) {
    const citations = [];
    let index = 0;

    while (index < units.length) {
      const first = units[index];
      const book = BOOKS[first.bookIndex];

      if (typeof first.label === "string") {
        citations.push(`${book.abbr} ${first.label}`);
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

  function buildPlan(startDate, totalDays) {
    if (parseCivilDate(startDate) === null) {
      throw new TypeError("A valid start date is required.");
    }

    return partitionCanon(totalDays).map((units, index) => ({
      day: index + 1,
      date: addCivilDays(startDate, index),
      units,
      citations: formatCitations(units),
    }));
  }

  const api = Object.freeze({
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
  const endPanel = document.querySelector("#reading-plan-end-panel");
  const daysPanel = document.querySelector("#reading-plan-days-panel");
  const errorBox = document.querySelector("#reading-plan-form-error");
  const status = document.querySelector("#reading-plan-status");
  const results = document.querySelector("#reading-plan-results");
  const resultsHeading = document.querySelector("#reading-plan-results-heading");
  const resultsSummary = document.querySelector("#reading-plan-summary");
  const resultsList = document.querySelector("#reading-plan-days");
  const printButton = document.querySelector("#reading-plan-print");
  const modeInputs = Array.from(form.querySelectorAll('input[name="duration-mode"]'));

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
    results.hidden = true;
    printButton.hidden = true;
    resultsHeading.textContent = "";
    resultsSummary.textContent = "";
    resultsList.replaceChildren();
    status.textContent = "";
  }

  function updateEndDateBounds() {
    if (parseCivilDate(startInput.value) === null) {
      endInput.removeAttribute("min");
      endInput.removeAttribute("max");
      return;
    }

    const maximumEndDate = addCivilDays(startInput.value, MAX_DAYS - 1);
    endInput.min = startInput.value;
    endInput.max = maximumEndDate;

    if (
      parseCivilDate(endInput.value) === null ||
      endInput.value < endInput.min ||
      endInput.value > endInput.max
    ) {
      endInput.value = addCivilDays(startInput.value, Math.min(364, MAX_DAYS - 1));
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

  function renderPlan(plan, startDate, endDate) {
    const fragment = document.createDocumentFragment();

    plan.forEach((entry) => {
      const day = document.createElement("li");
      day.className = "reading-plan-day";

      const heading = document.createElement("h3");
      const time = document.createElement("time");
      time.dateTime = entry.date;
      time.textContent = formatLongDate(entry.date);
      heading.append(`Day ${entry.day} — `, time);

      const readings = document.createElement("ul");
      readings.className = "reading-plan-readings";
      entry.citations.forEach((citation) => {
        const item = document.createElement("li");
        item.textContent = citation;
        readings.append(item);
      });

      day.append(heading, readings);
      fragment.append(day);
    });

    resultsHeading.textContent = `Your ${plan.length.toLocaleString()}-day reading plan`;
    resultsSummary.textContent = `${formatLongDate(startDate)} through ${formatLongDate(endDate)}. The full 73-book Catholic canon is scheduled in order without splitting chapters.`;
    resultsList.replaceChildren(fragment);
    results.hidden = false;
    printButton.hidden = false;
    status.textContent = `Generated a ${plan.length.toLocaleString()}-day reading plan.`;
    resultsHeading.focus();
  }

  startInput.value = todayAsCivilDate();
  updateEndDateBounds();
  synchronizeMode();
  form.hidden = false;

  startInput.addEventListener("change", updateEndDateBounds);
  modeInputs.forEach((input) => input.addEventListener("change", synchronizeMode));
  printButton.addEventListener("click", () => window.print());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearValidation();
    clearResults();

    if (parseCivilDate(startInput.value) === null) {
      showValidationError("Choose a valid start date.", startInput);
      return;
    }

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
      if (totalDays > MAX_DAYS) {
        showValidationError(`Choose a plan of no more than ${MAX_DAYS.toLocaleString()} days.`, endInput);
        return;
      }

      endDate = endInput.value;
    } else {
      const rawDays = daysInput.value.trim();
      totalDays = Number(rawDays);
      if (!/^\d+$/.test(rawDays) || !Number.isInteger(totalDays) || totalDays < 1 || totalDays > MAX_DAYS) {
        showValidationError(`Enter a whole number from 1 to ${MAX_DAYS.toLocaleString()}.`, daysInput);
        return;
      }

      endDate = addCivilDays(startInput.value, totalDays - 1);
    }

    renderPlan(buildPlan(startInput.value, totalDays), startInput.value, endDate);
  });
})();

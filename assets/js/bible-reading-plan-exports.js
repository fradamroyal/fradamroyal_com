// Site-owned download serializers for the Bible reading plan.
(function () {
  "use strict";

  const MIME_TYPES = Object.freeze({
    csv: "text/csv;charset=utf-8",
    markdown: "text/markdown;charset=utf-8",
    pdf: "application/pdf",
  });

  const EXTENSIONS = Object.freeze({
    csv: "csv",
    markdown: "md",
    pdf: "pdf",
  });

  const PDF_PAGE_WIDTH = 612;
  const PDF_PAGE_HEIGHT = 792;
  const PDF_MARGIN = 54;
  const PDF_DAY_TOP = 698;
  const PDF_BOTTOM = 52;
  const PDF_READING_LINE_HEIGHT = 12;

  function normalizeFormat(format) {
    if (format === "md") {
      return "markdown";
    }
    if (Object.hasOwn(MIME_TYPES, format)) {
      return format;
    }
    throw new RangeError(`Unknown export format: ${String(format)}.`);
  }

  function validatePlan(plan) {
    if (!Array.isArray(plan)) {
      throw new TypeError("The reading plan must be an array.");
    }

    plan.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw new TypeError(`Reading plan day ${index + 1} must be an object.`);
      }
    });

    return plan;
  }

  function text(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function citationsFor(reading) {
    return Array.isArray(reading?.citations)
      ? reading.citations.map(text).filter(Boolean)
      : [];
  }

  function readingsFor(entry) {
    if (Array.isArray(entry.readings) && entry.readings.length > 0) {
      return entry.readings.map((reading) => ({
        label: text(reading.label) || "Reading",
        citations: citationsFor(reading),
      }));
    }

    return [
      {
        label: "Reading",
        citations: Array.isArray(entry.citations)
          ? entry.citations.map(text).filter(Boolean)
          : [],
      },
    ];
  }

  function readingText(reading) {
    const citations = reading.citations.join("; ");
    return citations ? `${reading.label}: ${citations}` : `${reading.label}:`;
  }

  function entryHeading(entry, fallbackDay) {
    const day = Number.isInteger(entry.day) ? entry.day : fallbackDay;
    const date = text(entry.date);
    return date ? `Day ${day} - ${date}` : `Day ${day}`;
  }

  function csvField(value) {
    const valueText = text(value);
    return /[",\r\n]/.test(valueText) ? `"${valueText.replaceAll('"', '""')}"` : valueText;
  }

  function serializePlanToCsv(plan) {
    validatePlan(plan);
    const rows = ["Day,Date,Readings"];

    plan.forEach((entry, index) => {
      const day = Number.isInteger(entry.day) ? entry.day : index + 1;
      const combinedReadings = readingsFor(entry).map(readingText).join(" | ");
      rows.push([day, text(entry.date), combinedReadings].map(csvField).join(","));
    });

    return `${rows.join("\r\n")}\r\n`;
  }

  function markdownInline(value) {
    return text(value).replaceAll("\\", "\\\\").replace(/([*_[\]`])/g, "\\$1");
  }

  function planRange(plan) {
    if (plan.length === 0) {
      return "0 days";
    }

    const firstDate = text(plan[0].date);
    const lastDate = text(plan.at(-1).date);
    const duration = `${plan.length.toLocaleString("en-US")} ${plan.length === 1 ? "day" : "days"}`;

    if (!firstDate) {
      return duration;
    }
    if (!lastDate || lastDate === firstDate) {
      return `${firstDate} | ${duration}`;
    }
    return `${firstDate} to ${lastDate} | ${duration}`;
  }

  function serializePlanToMarkdown(plan, options = {}) {
    validatePlan(plan);
    const title = text(options.title) || "Bible Reading Plan";
    const lines = [`# ${markdownInline(title)}`, "", `_${markdownInline(planRange(plan))}_`, ""];

    plan.forEach((entry, index) => {
      const readings = readingsFor(entry);
      const heading = markdownInline(entryHeading(entry, index + 1));

      if (readings.length === 1) {
        const citations = readings[0].citations.map(markdownInline).join("; ");
        lines.push(`- [ ] **${heading}:** ${citations}`.trimEnd());
        return;
      }

      lines.push(`- [ ] **${heading}**`);
      readings.forEach((reading) => {
        const label = markdownInline(reading.label);
        const citations = reading.citations.map(markdownInline).join("; ");
        lines.push(`  - **${label}:** ${citations}`.trimEnd());
      });
    });

    return `${lines.join("\n")}\n`;
  }

  function asciiText(value) {
    return text(value)
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, "...")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "?");
  }

  function wrapAsciiText(value, maximumCharacters = 88) {
    const source = asciiText(value).replace(/\s+/g, " ").trim();
    if (!source) {
      return [""];
    }

    const lines = [];
    let remaining = source;

    while (remaining.length > maximumCharacters) {
      let breakAt = remaining.lastIndexOf(" ", maximumCharacters);
      if (breakAt < Math.floor(maximumCharacters * 0.55)) {
        breakAt = maximumCharacters;
      }
      lines.push(remaining.slice(0, breakAt).trimEnd());
      remaining = remaining.slice(breakAt).trimStart();
    }

    if (remaining) {
      lines.push(remaining);
    }
    return lines;
  }

  function pdfEscape(value) {
    return asciiText(value).replace(/([\\()])/g, "\\$1");
  }

  function pdfTextCommand(value, size, x, y) {
    return `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(value)}) Tj ET`;
  }

  function pdfBlocks(plan) {
    return plan.map((entry, index) => {
      const readingLines = readingsFor(entry).flatMap((reading) =>
        wrapAsciiText(readingText(reading)).map((line, lineIndex) =>
          lineIndex === 0 ? line : `  ${line}`,
        ),
      );

      return {
        heading: entryHeading(entry, index + 1),
        readingLines,
        height: 16 + readingLines.length * PDF_READING_LINE_HEIGHT + 10,
      };
    });
  }

  function paginatePdfBlocks(blocks) {
    if (blocks.length === 0) {
      return [[]];
    }

    const pages = [];
    let page = [];
    let y = PDF_DAY_TOP;

    blocks.forEach((block) => {
      if (page.length > 0 && y - block.height < PDF_BOTTOM) {
        pages.push(page);
        page = [];
        y = PDF_DAY_TOP;
      }
      page.push(block);
      y -= block.height;
    });
    pages.push(page);
    return pages;
  }

  function renderPdfPage(page, pageIndex, pageCount, title, subtitle) {
    const commands = [
      "q",
      "0 G",
      "0 g",
      pdfTextCommand(title, 16, PDF_MARGIN, 750),
      pdfTextCommand(subtitle, 9, PDF_MARGIN, 733),
      `0.5 w ${PDF_MARGIN} 720 m ${PDF_PAGE_WIDTH - PDF_MARGIN} 720 l S`,
      "Q",
    ];
    let y = PDF_DAY_TOP;

    page.forEach((block) => {
      commands.push(`q 0 G 0.8 w ${PDF_MARGIN} ${y - 2} 9 9 re S Q`);
      commands.push(pdfTextCommand(block.heading, 11, PDF_MARGIN + 16, y));
      let readingY = y - 16;
      block.readingLines.forEach((line) => {
        commands.push(pdfTextCommand(line, 9, PDF_MARGIN + 16, readingY));
        readingY -= PDF_READING_LINE_HEIGHT;
      });
      y -= block.height;
    });

    const footer = `Page ${pageIndex + 1} of ${pageCount}`;
    commands.push(pdfTextCommand(footer, 8, PDF_PAGE_WIDTH - PDF_MARGIN - footer.length * 4.1, 30));
    return `${commands.join("\n")}\n`;
  }

  function serializePdfObjects(objects, rootObjectNumber) {
    let pdf = "%PDF-1.4\n% Browser-generated reading plan\n";
    const offsets = [0];

    for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
      offsets[objectNumber] = pdf.length;
      pdf += `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += "0000000000 65535 f \n";
    for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
      pdf += `${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root ${rootObjectNumber} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

    return Uint8Array.from(pdf, (character) => character.charCodeAt(0));
  }

  function serializePlanToPdf(plan, options = {}) {
    validatePlan(plan);
    const title = asciiText(options.title || "Bible Reading Plan");
    const subtitle = asciiText(options.subtitle || planRange(plan));
    const pages = paginatePdfBlocks(pdfBlocks(plan));
    const objects = [null];
    const pageObjectNumbers = pages.map((_, index) => 4 + index * 2);

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

    pages.forEach((page, index) => {
      const pageObjectNumber = pageObjectNumbers[index];
      const contentObjectNumber = pageObjectNumber + 1;
      const stream = renderPdfPage(page, index, pages.length, title, subtitle);
      objects[pageObjectNumber] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
      objects[contentObjectNumber] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    });

    return serializePdfObjects(objects, 1);
  }

  function suggestFilename(plan, format) {
    validatePlan(plan);
    const normalizedFormat = normalizeFormat(format);
    const firstDate = text(plan[0]?.date);
    const lastDate = text(plan.at(-1)?.date);
    const datePart = firstDate
      ? lastDate && lastDate !== firstDate
        ? `-${firstDate}-to-${lastDate}`
        : `-${firstDate}`
      : "";
    return `bible-reading-plan${datePart}.${EXTENSIONS[normalizedFormat]}`;
  }

  function buildPlanExport(plan, format, options = {}) {
    const normalizedFormat = normalizeFormat(format);
    let data;

    if (normalizedFormat === "csv") {
      data = serializePlanToCsv(plan, options);
    } else if (normalizedFormat === "markdown") {
      data = serializePlanToMarkdown(plan, options);
    } else {
      data = serializePlanToPdf(plan, options);
    }

    return Object.freeze({
      data,
      mimeType: MIME_TYPES[normalizedFormat],
      extension: EXTENSIONS[normalizedFormat],
      filename: suggestFilename(plan, normalizedFormat),
    });
  }

  const api = Object.freeze({
    MIME_TYPES,
    serializePlanToCsv,
    serializePlanToMarkdown,
    serializePlanToPdf,
    suggestFilename,
    buildPlanExport,
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();

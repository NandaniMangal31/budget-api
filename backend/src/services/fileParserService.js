const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const csvParser = require("csv-parser");
const { Readable } = require("stream");

/**
 * Extracts plain text from any supported file buffer.
 * The AI service (or fallback) later turns this text into structured
 * expense line items.
 */
async function extractTextFromFile(buffer, originalName) {
  const name = originalName.toLowerCase();

  if (name.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  if (name.endsWith(".xlsx")) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let text = "";
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      text += `\n--- Sheet: ${sheetName} ---\n${csv}`;
    });
    return text;
  }

  if (name.endsWith(".csv")) {
    return await parseCsvBuffer(buffer);
  }

  throw new Error("Unsupported file type for parsing");
}

function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => {
        // Turn rows back into a simple text block the AI/fallback can read
        const lines = rows.map((row) => Object.values(row).join(", "));
        resolve(lines.join("\n"));
      })
      .on("error", reject);
  });
}

module.exports = { extractTextFromFile };

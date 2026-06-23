const xlsx = require("xlsx");
const csvParser = require("csv-parser");
const { Readable } = require("stream");
const { guessCategoryFromText, guessIncomeLabel } = require("../utils/categories");

// Header-name keyword groups used to auto-detect which column is which,
// regardless of exactly how the user's bank/app labelled them.
const COLUMN_HINTS = {
  date: ["date"],
  title: ["description", "narration", "merchant", "particular", "details", "payee"],
  category: ["category"],
  amount: ["amount", "amt", "value"],
  income: ["income", "credit", "money in", "deposit"],
  expense: ["expense", "debit", "money out", "withdrawal"],
  note: ["note", "remark", "memo"],
};

function findColumn(headers, hints) {
  return headers.find((h) => hints.some((hint) => String(h).toLowerCase().includes(hint)));
}

function detectColumns(headers) {
  return {
    dateCol: findColumn(headers, COLUMN_HINTS.date),
    titleCol: findColumn(headers, COLUMN_HINTS.title),
    categoryCol: findColumn(headers, COLUMN_HINTS.category),
    amountCol: findColumn(headers, COLUMN_HINTS.amount),
    incomeCol: findColumn(headers, COLUMN_HINTS.income),
    expenseCol: findColumn(headers, COLUMN_HINTS.expense),
    noteCol: findColumn(headers, COLUMN_HINTS.note),
  };
}

// A category like "[Balance]" or "[Transfer]" (square-bracket convention used
// by several spreadsheet templates) marks an opening balance or a transfer
// between the user's OWN accounts - not a real expense or income.
function isBookkeepingMarker(value) {
  if (!value) return false;
  const v = String(value).trim();
  return v.startsWith("[") && v.endsWith("]");
}

const INCOME_HINTS = /salary|refund|cashback|reimbursement|received|credited|interest income/i;

function toNumber(val) {
  if (val == null || val === "") return 0;
  const n = parseFloat(String(val).replace(/[₹$,]/g, ""));
  return isNaN(n) ? 0 : n;
}

function normalizeRow(row, cols) {
  const get = (col) => (col ? row[col] : undefined);

  // A real transaction always has a date. Rows without one are usually
  // footer/summary rows (e.g. a "Total" row adding up the whole sheet).
  const dateRaw = get(cols.dateCol);
  if (!dateRaw) return null;

  const rawCategory = get(cols.categoryCol);
  if (isBookkeepingMarker(rawCategory)) return null;

  const titleRaw = get(cols.titleCol) || rawCategory || "Scanned item";
  let amount = 0;
  let type = "expense";

  if (cols.incomeCol || cols.expenseCol) {
    const incomeVal = toNumber(get(cols.incomeCol));
    const expenseVal = toNumber(get(cols.expenseCol));
    if (incomeVal > 0) {
      amount = incomeVal;
      type = "income";
    } else if (expenseVal > 0) {
      amount = expenseVal;
      type = "expense";
    } else {
      return null; // both empty/zero - e.g. a header/balance row with no real movement
    }
  } else if (cols.amountCol) {
    const raw = toNumber(get(cols.amountCol));
    if (!raw) return null;
    const looksLikeIncome = INCOME_HINTS.test(String(rawCategory)) || INCOME_HINTS.test(String(titleRaw));
    if (raw < 0 || looksLikeIncome) {
      amount = Math.abs(raw);
      type = "income";
    } else {
      amount = raw;
      type = "expense";
    }
  } else {
    return null;
  }

  const note = get(cols.noteCol);
  const date = new Date(dateRaw);

  let category;
  if (type === "income") {
    category = guessIncomeLabel(`${rawCategory || ""} ${titleRaw}`);
  } else {
    category = !isBookkeepingMarker(rawCategory) && rawCategory ? String(rawCategory).trim() : guessCategoryFromText(titleRaw);
  }

  return {
    title: note ? `${titleRaw} — ${note}` : String(titleRaw),
    amount: Math.round(amount * 100) / 100,
    date: isNaN(date.getTime()) ? new Date() : date,
    category,
    type,
  };
}

function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// XLSX files often have a title row (and sometimes a copyright/blank row)
// before the real header row, and may contain extra sheets (Settings, Help,
// About) that aren't transaction data at all. This scans each sheet's first
// few rows for one that looks like a real header (has a date column plus an
// amount-ish column) and skips sheets that don't qualify.
function findTransactionTable(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });

    for (let i = 0; i < Math.min(grid.length, 10); i++) {
      const candidateHeaders = grid[i].map((h) => String(h || "").trim());
      const cols = detectColumns(candidateHeaders);
      if (cols.dateCol && (cols.amountCol || cols.incomeCol || cols.expenseCol)) {
        const dataRows = grid.slice(i + 1).map((rowArr) => {
          const obj = {};
          candidateHeaders.forEach((h, idx) => {
            if (h) obj[h] = rowArr[idx];
          });
          return obj;
        });
        return { rows: dataRows, cols };
      }
    }
  }
  return null;
}

/**
 * Attempts to parse a CSV/XLSX buffer as a structured transaction table.
 * Returns { handled: true, items } when it found a usable table, or
 * { handled: false } so the caller can fall back to the generic
 * text-extraction + AI/keyword pipeline instead.
 */
async function parseStructuredFile(buffer, filename) {
  const name = filename.toLowerCase();

  if (name.endsWith(".csv")) {
    const rows = await parseCsvBuffer(buffer);
    if (!rows.length) return { handled: false };
    const cols = detectColumns(Object.keys(rows[0]));
    if (!cols.dateCol && !cols.amountCol && !cols.incomeCol && !cols.expenseCol) {
      return { handled: false };
    }
    const items = rows.map((r) => normalizeRow(r, cols)).filter(Boolean);
    return { handled: true, items };
  }

  if (name.endsWith(".xlsx")) {
    const table = findTransactionTable(buffer);
    if (!table) return { handled: false };
    const items = table.rows.map((r) => normalizeRow(r, table.cols)).filter(Boolean);
    return { handled: true, items };
  }

  return { handled: false };
}

module.exports = { parseStructuredFile };

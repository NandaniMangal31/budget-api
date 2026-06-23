const OpenAI = require("openai");
const { DEFAULT_CATEGORIES, guessCategoryFromText, guessIncomeLabel } = require("../utils/categories");

let client = null;
if (process.env.OPENAI_API_KEY && process.env.AI_DISABLED !== "true") {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Takes raw text extracted from an uploaded document and returns a list of
 * structured items: [{ title, amount, date, category, type }] where type is
 * "expense" or "income" - money received (salary, refunds, etc.) is tagged
 * "income" instead of being dropped, so the caller can route it to the
 * separate Income collection instead of counting it as spend.
 *
 * existingCategories: the user's current category names, passed so the AI
 * prefers reusing them, but it is explicitly allowed to invent a new,
 * sensible category name if nothing fits - the caller is responsible for
 * adding any brand-new category to the user's Budget.categories list.
 *
 * IMPORTANT FALLBACK BEHAVIOUR:
 * If OPENAI_API_KEY is missing, AI_DISABLED=true, or the OpenAI call fails
 * for ANY reason (invalid key, expired key, quota/credits exhausted, rate
 * limit, network error) this function NEVER throws to the caller - it
 * transparently falls back to a free, local, keyword-based categorizer so
 * scanning + categorizing keeps working with zero AI cost.
 */
async function extractExpensesFromText(rawText, existingCategories = DEFAULT_CATEGORIES) {
  if (!rawText || !rawText.trim()) return { items: [], usedAI: false };

  if (client) {
    try {
      const items = await callOpenAI(rawText, existingCategories);
      return { items, usedAI: true };
    } catch (err) {
      console.warn(
        "⚠️  OpenAI categorization failed, falling back to rule-based categorizer:",
        err.message
      );
      // fall through to local fallback below
    }
  } else {
    console.warn("⚠️  OpenAI client not configured, using rule-based categorizer.");
  }

  const items = fallbackExtract(rawText);
  return { items, usedAI: false };
}

async function callOpenAI(rawText, existingCategories) {
  const truncated = rawText.slice(0, 12000); // keep prompt size sane

  const systemPrompt = `You are a financial document parser. You will be given raw text
extracted from a bank statement, receipt, or expense sheet. Extract every individual
transaction line you can find and return STRICT JSON only, no prose, in this shape:

{ "items": [ { "title": string, "amount": number, "date": "YYYY-MM-DD" | null, "category": string, "type": "expense" | "income" } ] }

Rules:
- "amount" must always be a positive number (no currency symbols, no commas, no minus sign - use "type" to indicate direction instead).
- Set "type" to "income" for money the user RECEIVED (salary, refunds, cashback, reimbursements, deposits, interest credited) and "expense" for money spent.
- For income items, a short category like "Salary", "Refund", "Cashback" or "Interest" is fine.
- For expense items, prefer reusing one of these existing categories when it fits: ${existingCategories.join(", ")}. If none fit, invent a short, sensible new category name (1-2 words).
- Do not skip income/credit lines - include them with type "income" instead of omitting them.
- If you truly cannot find any transactions, return { "items": [] }.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: truncated },
    ],
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return items
    .filter((it) => it && it.title && typeof it.amount === "number" && it.amount > 0)
    .map((it) => ({
      title: String(it.title).slice(0, 200),
      amount: Math.round(Math.abs(it.amount) * 100) / 100,
      date: it.date ? new Date(it.date) : new Date(),
      category: it.category ? String(it.category).slice(0, 50) : "Others",
      type: it.type === "income" ? "income" : "expense",
    }));
}

// Words that strongly suggest a line is money coming IN rather than going out.
const INCOME_HINTS = /salary|refund|cashback|reimbursement|received|credited|deposit/i;

/**
 * Finds the amount on a line of free text without getting confused by dates.
 * The old version of this used the FIRST number-like token on the line,
 * which meant a line starting with "2026-05-13, ..." would grab "2026" out
 * of the date and use that as the amount for every single row. This version:
 *  1. strips date-like substrings first so they can never match
 *  2. prefers a currency-marked or decimal amount (e.g. "$2,500" or "499.00")
 *     over a bare integer, since plain numbers are more often quantities,
 *     percentages, or codes
 *  3. among several currency/decimal matches on one line (common in tables
 *     like "Item  Rate  Qty  $2,500"), takes the LAST one - line totals tend
 *     to come after unit rates
 */
function extractAmountAndTitle(originalLine) {
  const dateStripped = originalLine
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, " ");

  const matches = [...dateStripped.matchAll(/(-?)(?:₹|rs\.?|inr|\$)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi)];
  if (!matches.length) return null;

  const strong = matches.filter((m) => /\./.test(m[0]) || /[₹$]|rs\.?|inr/i.test(m[0]));
  const best = strong.length ? strong[strong.length - 1] : matches[matches.length - 1];

  const numeric = parseFloat(best[2].replace(/,/g, ""));
  if (!numeric) return null;

  const title = dateStripped.replace(best[0], "").replace(/\s{2,}/g, " ").trim().slice(0, 150) || "Scanned item";

  return { amount: numeric, isNegative: best[1] === "-", title };
}

/**
 * Free, local fallback: scans line by line for a currency-like number and
 * guesses a category from keywords. Not as smart as the AI, but means the
 * app keeps scanning + categorizing documents even with zero AI credits.
 */
function fallbackExtract(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];

  for (const line of lines) {
    const parsed = extractAmountAndTitle(line);
    if (!parsed) continue;
    if (parsed.amount <= 0 || parsed.amount > 10000000) continue;

    // a negative amount on a personal ledger usually means money came back
    const type = INCOME_HINTS.test(line) || parsed.isNegative ? "income" : "expense";
    const category = type === "income" ? guessIncomeLabel(line) : guessCategoryFromText(line);

    items.push({
      title: parsed.title,
      amount: Math.round(parsed.amount * 100) / 100,
      date: new Date(),
      category,
      type,
    });
  }

  return items;
}

module.exports = { extractExpensesFromText };

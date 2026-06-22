const OpenAI = require("openai");
const { DEFAULT_CATEGORIES, guessCategoryFromText } = require("../utils/categories");

let client = null;
if (process.env.OPENAI_API_KEY && process.env.AI_DISABLED !== "true") {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: "https://openrouter.ai/api/v1", });
}

/**
 * Takes raw text extracted from an uploaded document and returns a list of
 * structured expense items: [{ title, amount, date, category }]
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
transaction/expense line you can find and return STRICT JSON only, no prose, in this shape:

{ "items": [ { "title": string, "amount": number, "date": "YYYY-MM-DD" | null, "category": string } ] }

Rules:
- "amount" must be a positive number (no currency symbols, no commas).
- Prefer reusing one of these existing categories when it fits: ${existingCategories.join(", ")}.
- If none of those fit, invent a short, sensible new category name (1-2 words).
- Ignore lines that are clearly incoming money/credits/refunds/salary - do NOT include those as expenses.
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
      amount: Math.round(it.amount * 100) / 100,
      date: it.date ? new Date(it.date) : new Date(),
      category: it.category ? String(it.category).slice(0, 50) : "Others",
    }));
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

  const amountRegex = /(?:₹|rs\.?|inr|\$)?\s?(\d{1,3}(?:[,\d]{0,10})(?:\.\d{1,2})?)/i;
  const items = [];

  for (const line of lines) {
    const match = line.match(amountRegex);
    if (!match) continue;

    const numeric = parseFloat(match[1].replace(/,/g, ""));
    if (!numeric || numeric <= 0 || numeric > 10000000) continue;

    const title = line.replace(match[0], "").trim().slice(0, 150) || "Scanned item";

    items.push({
      title,
      amount: Math.round(numeric * 100) / 100,
      date: new Date(),
      category: guessCategoryFromText(line),
    });
  }

  return items;
}

module.exports = { extractExpensesFromText };

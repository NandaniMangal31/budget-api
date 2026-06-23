const express = require("express");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const asyncHandler = require("../middleware/asyncHandler");
const { extractTextFromFile } = require("../services/fileParserService");
const { extractExpensesFromText } = require("../services/aiService");
const { parseStructuredFile } = require("../services/structuredParserService");
const { checkBudgetThresholds, ensureCategoryExists, getOrCreateBudget } = require("../services/budgetAlertService");

const router = express.Router();
router.use(protect);

// POST /api/scan/upload   (multipart/form-data, field name: "document")
router.post(
  "/upload",
  upload.single("document"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const budget = await getOrCreateBudget(req.userId);
    const existingCategories = budget.categories.map((c) => c.name);

    // CSV/XLSX have real columns - try reading them directly first. This is
    // far more accurate than flattening to text and guessing, and doesn't
    // need AI at all. Only fall back to text+AI/keyword parsing if the file
    // isn't CSV/XLSX, or doesn't look like a recognizable transaction table.
    let items = [];
    let parsedWith = "ai";

    const structured = await parseStructuredFile(req.file.buffer, req.file.originalname);
    if (structured.handled) {
      items = structured.items;
      parsedWith = "structured-data";
    } else {
      const rawText = await extractTextFromFile(req.file.buffer, req.file.originalname);
      const result = await extractExpensesFromText(rawText, existingCategories);
      items = result.items;
      parsedWith = result.usedAI ? "ai" : "rule-based";
    }

    if (items.length === 0) {
      return res.status(200).json({
        message: "No transactions could be found in this document.",
        parsedWith,
        expenses: [],
        income: [],
      });
    }

    const expenseItems = items.filter((it) => it.type !== "income");
    const incomeItems = items.filter((it) => it.type === "income");

    const insertedExpenses = expenseItems.length
      ? await Expense.insertMany(
          expenseItems.map((item) => ({
            user: req.userId,
            title: item.title,
            amount: item.amount,
            category: item.category,
            date: item.date,
            source: "scanned",
            sourceFile: req.file.originalname,
          }))
        )
      : [];

    const insertedIncome = incomeItems.length
      ? await Income.insertMany(
          incomeItems.map((item) => ({
            user: req.userId,
            title: item.title,
            amount: item.amount,
            date: item.date,
            note: `Scanned from ${req.file.originalname}`,
          }))
        )
      : [];

    // make sure any brand-new categories the AI/fallback/structured parser
    // invented show up in budget settings (income doesn't use categories)
    const uniqueCategories = [...new Set(expenseItems.map((i) => i.category))];
    for (const cat of uniqueCategories) {
      await ensureCategoryExists(req.userId, cat);
    }

    const alertInfo = await checkBudgetThresholds(req.userId);

    res.status(201).json({
      message: `Scanned ${insertedExpenses.length} expense(s) and ${insertedIncome.length} income entr${insertedIncome.length === 1 ? "y" : "ies"}.`,
      parsedWith,
      expenses: insertedExpenses,
      income: insertedIncome,
      budgetStatus: alertInfo,
    });
  })
);

module.exports = router;

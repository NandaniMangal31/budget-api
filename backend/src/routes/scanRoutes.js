const express = require("express");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { extractTextFromFile } = require("../services/fileParserService");
const { extractExpensesFromText } = require("../services/aiService");
const { checkBudgetThresholds, ensureCategoryExists } = require("../services/budgetAlertService");

const router = express.Router();
router.use(protect);

// POST /api/scan/upload   (multipart/form-data, field name: "document")
router.post("/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rawText = await extractTextFromFile(req.file.buffer, req.file.originalname);

    const budget = await Budget.findOne({ user: req.userId });
    const existingCategories = budget ? budget.categories.map((c) => c.name) : [];

    const { items, usedAI } = await extractExpensesFromText(rawText, existingCategories);

    if (items.length === 0) {
      return res.status(200).json({
        message: "No expense line items could be found in this document.",
        usedAI,
        expenses: [],
      });
    }

    const docsToInsert = items.map((item) => ({
      user: req.userId,
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date,
      source: "scanned",
      sourceFile: req.file.originalname,
    }));

    const inserted = await Expense.insertMany(docsToInsert);

    // make sure any brand-new categories the AI/fallback invented show up in budget settings
    const uniqueCategories = [...new Set(items.map((i) => i.category))];
    for (const cat of uniqueCategories) {
      await ensureCategoryExists(req.userId, cat);
    }

    const alertInfo = await checkBudgetThresholds(req.userId);

    res.status(201).json({
      message: `Scanned and categorized ${inserted.length} item(s).`,
      usedAI,
      expenses: inserted,
      budgetStatus: alertInfo,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to scan document", error: err.message });
  }
});

module.exports = router;

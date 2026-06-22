const express = require("express");
const Expense = require("../models/Expense");
const protect = require("../middleware/authMiddleware");
const { checkBudgetThresholds, ensureCategoryExists } = require("../services/budgetAlertService");

const router = express.Router();
router.use(protect);

// GET /api/expenses
router.get("/", async (req, res) => {
  const expenses = await Expense.find({ user: req.userId }).sort({ date: -1, createdAt: -1 });
  res.json({ expenses });
});

// POST /api/expenses   { title, amount, category, date }
router.post("/", async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;
    if (!title || !amount || amount <= 0 || !category) {
      return res.status(400).json({ message: "title, a positive amount, and category are required" });
    }

    const expense = await Expense.create({
      user: req.userId,
      title,
      amount,
      category,
      date: date ? new Date(date) : new Date(),
      source: "manual",
    });

    await ensureCategoryExists(req.userId, category);
    const alertInfo = await checkBudgetThresholds(req.userId);

    res.status(201).json({ expense, budgetStatus: alertInfo });
  } catch (err) {
    res.status(500).json({ message: "Failed to add expense", error: err.message });
  }
});

// DELETE /api/expenses/all  - must be defined before /:id
router.delete("/all", async (req, res) => {
  await Expense.deleteMany({ user: req.userId });
  res.json({ message: "All expenses deleted" });
});

// DELETE /api/expenses/:id
router.delete("/:id", async (req, res) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!expense) return res.status(404).json({ message: "Expense not found" });
  res.json({ message: "Expense deleted" });
});

module.exports = router;

const express = require("express");
const Income = require("../models/Income");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// GET /api/income
router.get("/", async (req, res) => {
  const income = await Income.find({ user: req.userId }).sort({ date: -1, createdAt: -1 });
  res.json({ income });
});

// POST /api/income   { title, amount, date, note }
router.post("/", async (req, res) => {
  const { title, amount, date, note } = req.body;
  if (!title || !amount || amount <= 0) {
    return res.status(400).json({ message: "title and a positive amount are required" });
  }

  const entry = await Income.create({
    user: req.userId,
    title,
    amount,
    date: date ? new Date(date) : new Date(),
    note,
  });

  res.status(201).json({ income: entry });
});

// DELETE /api/income/all
router.delete("/all", async (req, res) => {
  await Income.deleteMany({ user: req.userId });
  res.json({ message: "All income entries deleted" });
});

// DELETE /api/income/:id
router.delete("/:id", async (req, res) => {
  const entry = await Income.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!entry) return res.status(404).json({ message: "Income entry not found" });
  res.json({ message: "Income entry deleted" });
});

module.exports = router;

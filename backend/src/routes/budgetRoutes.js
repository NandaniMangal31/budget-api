const express = require("express");
const Budget = require("../models/Budget");
const { DEFAULT_CATEGORIES } = require("../utils/categories");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// GET /api/budget
router.get("/", async (req, res) => {
  let budget = await Budget.findOne({ userId: req.userId });
  if (!budget) {
    budget = await Budget.create({
      userId: req.userId,
      totalBudget: 0,
      categories: DEFAULT_CATEGORIES.map((name) => ({ name, allocated: 0 })),
    });
  }
  res.json({ budget });
});

// POST /api/budget/total  { totalBudget }
router.post("/total", async (req, res) => {
  const { totalBudget } = req.body;
  if (totalBudget == null || totalBudget < 0) {
    return res.status(400).json({ message: "totalBudget must be a non-negative number" });
  }

  const budget = await Budget.findOne({ userId: req.userId });
  if (!budget) return res.status(404).json({ message: "Budget not found" });

  const allocatedSum = budget.categories.reduce((sum, c) => sum + c.allocated, 0);
  if (allocatedSum > totalBudget) {
    return res.status(400).json({
      message: `Your category allocations already total ₹${allocatedSum}, which is more than the new total budget (₹${totalBudget}). Lower category allocations first.`,
    });
  }

  budget.totalBudget = totalBudget;
  // changing the total budget resets alert flags so 50/80/100% can fire again
  budget.notified = { 50: false, 80: false, 100: false };
  await budget.save();

  res.json({ budget });
});

// POST /api/budget/category   { name, allocated }
// Adds or updates a single category's allocation. Rejects if the new sum
// of all category allocations would exceed totalBudget.
router.post("/category", async (req, res) => {
  const { name, allocated } = req.body;
  if (!name || allocated == null || allocated < 0) {
    return res.status(400).json({ message: "name and a non-negative allocated amount are required" });
  }

  const budget = await Budget.findOne({ userId: req.userId });
  if (!budget) return res.status(404).json({ message: "Budget not found" });

  const existingIndex = budget.categories.findIndex(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );

  const otherCategoriesSum = budget.categories.reduce(
    (sum, c, idx) => (idx === existingIndex ? sum : sum + c.allocated),
    0
  );
  const newTotalAllocated = otherCategoriesSum + allocated;

  if (newTotalAllocated > budget.totalBudget) {
    return res.status(400).json({
      message: `Setting "${name}" to ₹${allocated} would make total category allocations ₹${newTotalAllocated}, which exceeds your total budget of ₹${budget.totalBudget}. Reduce this amount or raise your total budget first.`,
    });
  }

  if (existingIndex >= 0) {
    budget.categories[existingIndex].allocated = allocated;
  } else {
    budget.categories.push({ name, allocated });
  }

  await budget.save();
  res.json({ budget });
});

// DELETE /api/budget/category/:name
router.delete("/category/:name", async (req, res) => {
  const budget = await Budget.findOne({ user: req.userId });
  if (!budget) return res.status(404).json({ message: "Budget not found" });

  budget.categories = budget.categories.filter(
    (c) => c.name.toLowerCase() !== req.params.name.toLowerCase()
  );
  await budget.save();
  res.json({ budget });
});

module.exports = router;

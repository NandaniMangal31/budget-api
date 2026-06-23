const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const User = require("../models/User");
const { sendBudgetAlertEmail } = require("./emailService");
const { DEFAULT_CATEGORIES } = require("../utils/categories");

/**
 * Every other place in the app used to do `Budget.findOne(...)` and either
 * 404 or silently no-op if it came back null. In practice a Budget doc can
 * end up missing for a user (e.g. an account created before this logic
 * existed, a manual DB edit, a partial failure during registration) and
 * that used to break the whole dashboard. This makes the app self-healing:
 * any code path that needs a budget gets one, creating it on the fly if
 * it's missing, instead of erroring out.
 */
async function getOrCreateBudget(userId) {
  let budget = await Budget.findOne({ user: userId });
  if (!budget) {
    budget = await Budget.create({
      user: userId,
      totalBudget: 0,
      categories: DEFAULT_CATEGORIES.map((name) => ({ name, allocated: 0 })),
    });
  }
  return budget;
}

/**
 * Call this after any expense is added (manual or scanned).
 * Recomputes total spent, and emails the user once per threshold (50/80/100)
 * the first time it's crossed. Thresholds reset automatically whenever the
 * user changes their total budget (see budgetRoutes.js).
 */
async function checkBudgetThresholds(userId) {
  const budget = await getOrCreateBudget(userId);
  if (!budget.totalBudget || budget.totalBudget <= 0) return;

  const expenses = await Expense.find({ user: userId });
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const percent = (totalSpent / budget.totalBudget) * 100;

  const thresholds = [100, 80, 50]; // check highest first
  let user = null;

  for (const threshold of thresholds) {
    const alreadyNotified = budget.notified && budget.notified[threshold];
    if (percent >= threshold && !alreadyNotified) {
      if (!user) user = await User.findById(userId);
      if (user) {
        await sendBudgetAlertEmail(user.email, {
          threshold,
          totalSpent,
          totalBudget: budget.totalBudget,
        });
      }
      budget.notified[threshold] = true;
    }
  }

  await budget.save();
  return { totalSpent, percent };
}

// If a scanned/manual expense introduces a category the user has never seen
// before, add it to their Budget.categories list at 0 allocation so it shows
// up in settings/chart instead of silently disappearing.
async function ensureCategoryExists(userId, categoryName) {
  const budget = await getOrCreateBudget(userId);
  const exists = budget.categories.some(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (!exists) {
    budget.categories.push({ name: categoryName, allocated: 0 });
    await budget.save();
  }
}

module.exports = { getOrCreateBudget, checkBudgetThresholds, ensureCategoryExists };

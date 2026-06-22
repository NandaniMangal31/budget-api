const mongoose = require("mongoose");

const categoryAllocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    allocated: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    totalBudget: { type: Number, default: 0, min: 0 },
    categories: { type: [categoryAllocationSchema], default: [] },
    // tracks which alert thresholds have already been emailed, so we don't spam
    // the user every time a new expense is added. Reset when totalBudget changes.
    notified: {
      50: { type: Boolean, default: false },
      80: { type: Boolean, default: false },
      100: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Budget", budgetSchema);

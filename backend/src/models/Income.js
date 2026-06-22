const mongoose = require("mongoose");

// Money the user RECEIVED (salary, refund, gift, etc.).
// Deliberately a separate collection from Expense so it never counts
// toward spending totals or category charts.
const incomeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Income", incomeSchema);

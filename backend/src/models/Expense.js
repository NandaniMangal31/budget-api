const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    source: { type: String, enum: ["manual", "scanned"], default: "manual" },
    sourceFile: { type: String }, // original filename, only set when source === "scanned"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);

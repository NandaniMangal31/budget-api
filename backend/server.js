require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");
const budgetRoutes = require("./src/routes/budgetRoutes");
const expenseRoutes = require("./src/routes/expenseRoutes");
const incomeRoutes = require("./src/routes/incomeRoutes");
const scanRoutes = require("./src/routes/scanRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/scan", scanRoutes);

// Multer (file upload) errors land here - e.g. wrong file type, file too large
app.use((err, req, res, next) => {
  if (err && err.message) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Generic fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});

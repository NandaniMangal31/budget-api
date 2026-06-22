import { useState } from "react";
import api from "../api/axios";

export default function AddExpenseForm({ categories, onAdded }) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: categories[0]?.name || "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [customCategory, setCustomCategory] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const category = form.category === "__custom__" ? customCategory.trim() : form.category;
    if (!form.title || !form.amount || Number(form.amount) <= 0 || !category) {
      setError("Please fill in a title, a positive amount, and a category.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/expenses", {
        title: form.title,
        amount: Number(form.amount),
        category,
        date: form.date,
      });
      setForm({ ...form, title: "", amount: "" });
      setCustomCategory("");
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Add an expense manually</div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field">
            <label>What was it?</label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Café Coffee Day"
              value={form.title}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>Amount (₹)</label>
            <input
              type="number"
              name="amount"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="__custom__">+ New category…</option>
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} />
          </div>
        </div>

        {form.category === "__custom__" && (
          <div className="field">
            <label>New category name</label>
            <input
              type="text"
              placeholder="e.g. Pet care"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          </div>
        )}

        {error && <div className="error-text">{error}</div>}

        <button className="btn btn-accent btn-block" type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add expense"}
        </button>
      </form>
    </div>
  );
}

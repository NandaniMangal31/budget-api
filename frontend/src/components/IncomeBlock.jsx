import { useState } from "react";
import api from "../api/axios";

export default function IncomeBlock({ income, onChange }) {
  const [form, setForm] = useState({ title: "", amount: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!form.title || !form.amount || Number(form.amount) <= 0) {
      setError("Add a title and a positive amount.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/income", { title: form.title, amount: Number(form.amount) });
      setForm({ title: "", amount: "" });
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add income");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/income/${id}`);
    onChange();
  }

  return (
    <div className="card">
      <div className="card-title">Money received</div>
      <p className="loading-text" style={{ marginTop: -8, marginBottom: 14 }}>
        Salary, refunds, gifts — kept separate, never counted as an expense.
      </p>

      <form onSubmit={handleAdd} className="form-row income-form-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="e.g. Salary"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="field" style={{ marginBottom: 0, maxWidth: 110 }}>
          <input
            type="number"
            min="0"
            placeholder="₹"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <button className="btn btn-ghost btn-sm" type="submit" disabled={submitting}>
          {submitting ? "…" : "Add"}
        </button>
      </form>
      {error && <div className="error-text">{error}</div>}

      {income.slice(0, 6).map((inc) => (
        <div className="expense-row" key={inc._id} style={{ gridTemplateColumns: "1fr 100px auto" }}>
          <div className="expense-title">{inc.title}</div>
          <div className="expense-amount num" style={{ color: "var(--teal)" }}>
            +₹{inc.amount.toLocaleString()}
          </div>
          <button className="icon-btn" onClick={() => handleDelete(inc._id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

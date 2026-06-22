import { useState } from "react";
import api from "../api/axios";

export default function ExpenseList({ expenses, onChange }) {
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      onChange();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("Delete ALL expenses? This can't be undone.")) return;
    setDeletingAll(true);
    try {
      await api.delete("/expenses/all");
      onChange();
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="card">
      <div className="list-header">
        <div className="card-title" style={{ marginBottom: 0 }}>
          Expenses ({expenses.length})
        </div>
        {expenses.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={handleDeleteAll} disabled={deletingAll}>
            {deletingAll ? "Deleting…" : "Delete all"}
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">No expenses yet. Add one manually or scan a statement.</div>
      ) : (
        <div className="expense-scroll">
          {expenses.map((exp) => (
            <div className="expense-row" key={exp._id}>
            <div>
              <div className="expense-title">{exp.title}</div>
              <span className={`badge ${exp.source === "scanned" ? "scanned" : ""}`}>
                {exp.category}
              </span>
            </div>
            <div className="expense-meta">{new Date(exp.date).toLocaleDateString()}</div>
            <div className="expense-amount num">₹{exp.amount.toLocaleString()}</div>
            <button
              className="icon-btn"
              title="Delete"
              onClick={() => handleDelete(exp._id)}
              disabled={deletingId === exp._id}
            >
              ✕
            </button>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}

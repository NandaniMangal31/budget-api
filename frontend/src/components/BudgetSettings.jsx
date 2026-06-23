import { useState } from "react";
import api from "../api/axios";

export default function BudgetSettings({ budget, onChange }) {
  const [totalInput, setTotalInput] = useState(budget?.totalBudget ?? 0);
  const [catInputs, setCatInputs] = useState(
    Object.fromEntries((budget?.categories || []).map((c) => [c.name, c.allocated]))
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingTotal, setSavingTotal] = useState(false);
  const [savingCat, setSavingCat] = useState("");

  const allocatedSum = (budget?.categories || []).reduce((sum, c) => sum + c.allocated, 0);

  async function handleSaveTotal(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const value = Number(totalInput);

    if (value < allocatedSum) {
      setError(
        `Category allocations already total ₹${allocatedSum}. Lower those first or pick a higher total budget.`
      );
      return;
    }

    setSavingTotal(true);
    try {
      await api.post("/budget/total", { totalBudget: value });
      setSuccess("Total budget updated.");
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update total budget");
    } finally {
      setSavingTotal(false);
    }
  }

  async function handleSaveCategory(name) {
    setError("");
    setSuccess("");
    const allocated = Number(catInputs[name] ?? 0);

    setSavingCat(name);
    try {
      await api.post("/budget/category", { name, allocated });
      setSuccess(`"${name}" budget updated.`);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update category budget");
    } finally {
      setSavingCat("");
    }
  }

  return (
    <div className="card">
      <div className="card-title">Budget settings</div>

      <form onSubmit={handleSaveTotal} className="form-row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 0 , maxWidth: 200 }}>
          <label>Total monthly budget (₹)</label>
          <input
            type="number"
            min="0"
            value={totalInput}
            onChange={(e) => setTotalInput(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" type="submit" disabled={savingTotal} style={{ marginTop: 22 , backgroundColor: "var(--teal)", color: "white"}}>
          {savingTotal ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="card-title" style={{ fontSize: "0.85rem" }}>
        Category limits
        <span className="loading-text">
          ₹{allocatedSum.toLocaleString()} / ₹{(budget?.totalBudget || 0).toLocaleString()} allocated
        </span>
      </div>

      <div className="cat-scroll">
        {(budget?.categories || []).map((cat) => (
          <div className="cat-row" key={cat.name}>
            <span className="cat-name">{cat.name}</span>
            <input
              type="number"
              min="0"
              value={catInputs[cat.name] ?? cat.allocated}
              onChange={(e) => setCatInputs({ ...catInputs, [cat.name]: e.target.value })}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleSaveCategory(cat.name)}
              disabled={savingCat === cat.name}
            >
              {savingCat === cat.name ? "…" : "Set"}
            </button>
          </div>
        ))}
      </div>

      {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
      {success && <div className="success-text" style={{ marginTop: 12 }}>{success}</div>}
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/axios";
import BudgetSettings from "../components/BudgetSettings";
import UploadDocument from "../components/UploadDocument";
import AddExpenseForm from "../components/AddExpenseForm";
import ExpenseList from "../components/ExpenseList";
import IncomeBlock from "../components/IncomeBlock";
import CategoryAreaChart from "../components/CategoryAreaChart";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshAll = useCallback(async () => {
    setError("");
    try {
      const [budgetRes, expensesRes, incomeRes] = await Promise.all([
        api.get("/budget"),
        api.get("/expenses"),
        api.get("/income"),
      ]);
      setBudget(budgetRes.data.budget);
      setExpenses(expensesRes.data.expenses);
      setIncome(incomeRes.data.income);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );
  const totalReceived = useMemo(
    () => income.reduce((sum, i) => sum + i.amount, 0),
    [income]
  );
  const totalBudget = budget?.totalBudget || 0;
  const percent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 999) : 0;

  let meterClass = "ok";
  if (percent >= 100) meterClass = "danger";
  else if (percent >= 50) meterClass = "warn";

  if (loading) {
    return <div className="container" style={{ padding: 40 }}>Loading your dashboard…</div>;
  }

  return (
    <div>
      <div className="dash-header container">
        <h1>Hey {user?.name?.split(" ")[0] || "there"} 👋</h1>
        <p className="loading-text">Here's where your money went.</p>
      </div>

      <div className="container">
        {error && <div className="error-text">{error}</div>}

        <div className="stat-row" style={{ marginTop: 18 }}>
          <div className="stat">
            <div className="stat-label">Total budget</div>
            <div className="stat-value num">₹{totalBudget.toLocaleString()}</div>
          </div>
          <div className="stat spent">
            <div className="stat-label">Spent</div>
            <div className="stat-value num">₹{totalSpent.toLocaleString()}</div>
          </div>
          <div className="stat income">
            <div className="stat-label">Received</div>
            <div className="stat-value num">₹{totalReceived.toLocaleString()}</div>
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="budget-meter">
              <div className="meter-track">
                <div
                  className={`meter-fill ${meterClass}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <div className="meter-caption">
                <span>{percent.toFixed(0)}% of budget used</span>
                <span>
                  ₹{totalSpent.toLocaleString()} / ₹{totalBudget.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dash-grid container">
        <div className="stack">
          <BudgetSettings budget={budget} onChange={refreshAll} />
          <UploadDocument onScanned={refreshAll} />
          <IncomeBlock income={income} onChange={refreshAll} />
        </div>

        <div className="stack">
          <CategoryAreaChart expenses={expenses} budget={budget} />
          <AddExpenseForm categories={budget?.categories || []} onAdded={refreshAll} />
          <ExpenseList expenses={expenses} onChange={refreshAll} />
        </div>
      </div>
    </div>
  );
}

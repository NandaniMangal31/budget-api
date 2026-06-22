import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: "0.82rem",
      }}
    >
      <div style={{ fontWeight: 700 }}>{point.category}</div>
      <div>₹{point.amount.toLocaleString()} ({point.percent.toFixed(1)}%)</div>
    </div>
  );
}

export default function CategoryAreaChart({ expenses, budget }) {
  const data = useMemo(() => {
    const totals = {};
    let grandTotal = 0;

    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
      grandTotal += exp.amount;
    }

    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalSpent = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="card">
      <div className="card-title">
        Spending by category
        <span className="loading-text num">Total ₹{totalSpent.toLocaleString()}</span>
      </div>

      {data.length === 0 ? (
        <div className="empty-state">Add or scan an expense to see your breakdown.</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="catFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f7a6c" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#1f7a6c" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ece8df" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "#7a7f8c" }}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#7a7f8c" }}
              unit="%"
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="percent"
              stroke="#1f7a6c"
              strokeWidth={2}
              fill="url(#catFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

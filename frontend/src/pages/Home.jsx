import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SAMPLE_ROWS = [
  { cat: "Food", amt: "₹4,250" },
  { cat: "Tea & Coffee", amt: "₹980" },
  { cat: "Travel", amt: "₹2,100" },
  { cat: "Shopping", amt: "₹3,600" },
  { cat: "Entertainment", amt: "₹1,200" },
];

export default function Home() {
  const { user } = useAuth();
  const ctaTarget = user ? "/dashboard" : "/register";

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Budget tracking, sorted</div>
            <h1>
              Scan a statement.
              <br />
              Know exactly where it went.
            </h1>
            <p>
              Upload a PDF, CSV, DOCX, TXT or Excel file and Pocket Ledger reads it,
              sorts every expense into a category, and tells you the moment you're
              close to going over budget — by email, at 50%, 80% and 100%.
            </p>
            <div className="hero-actions">
              <Link to={ctaTarget} className="btn btn-accent">
                {user ? "Go to dashboard" : "Get started free"}
              </Link>
              {!user && (
                <Link to="/login" className="btn btn-ghost" style={{ color: "white", borderColor: "#444" }}>
                  Log in
                </Link>
              )}
            </div>
          </div>

          <div className="receipt">
            <div className="r-head">
              <span className="label">Spent this month</span>
              <span className="amount num">₹12,130</span>
            </div>
            {SAMPLE_ROWS.map((row) => (
              <div className="receipt-row" key={row.cat}>
                <span className="cat">{row.cat}</span>
                <span className="amt num">{row.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Everything in one ledger</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="icon">A</div>
              <h3>AI-sorted categories</h3>
              <p>Food, tea &amp; coffee, insurance, investment, travel, shopping, entertainment and more — sorted automatically.</p>
            </div>
            <div className="feature-card">
              <div className="icon">S</div>
              <h3>Scan any file</h3>
              <p>PDF, CSV, DOCX, TXT or XLSX — drop a statement in and let it read every line for you.</p>
            </div>
            <div className="feature-card">
              <div className="icon">B</div>
              <h3>Budgets that hold</h3>
              <p>Set a total budget and per-category limits. Category limits can never add up to more than the total.</p>
            </div>
            <div className="feature-card">
              <div className="icon">M</div>
              <h3>Email alerts</h3>
              <p>Get nudged the moment you cross 50%, 80% and 100% of your budget — no surprises at month end.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

# Pocket Ledger — Budget & Expense Tracker

Full-stack budget tracker: scan a bank statement / receipt (PDF, CSV, DOCX,
TXT, XLSX) and it gets read, categorized, and saved automatically. Set a
total budget and per-category limits, add expenses manually, and get an
email the moment you cross 50%, 80% or 100% of your budget.

**Stack:** React + Vite (frontend) · Node/Express + MongoDB (backend) ·
OpenAI (document categorization, with a free offline fallback) · Gmail/Nodemailer (alert emails)

---

## 1. Folder structure

```
budget-app/
├── backend/
│   ├── server.js                     # Express entry point
│   ├── .env.example                  # copy to .env and fill in
│   └── src/
│       ├── config/db.js              # MongoDB connection
│       ├── middleware/
│       │   ├── authMiddleware.js     # JWT route protection
│       │   └── upload.js             # multer file upload config
│       ├── models/
│       │   ├── User.js
│       │   ├── Budget.js             # total + per-category allocations
│       │   ├── Expense.js
│       │   └── Income.js             # the separate "money received" block
│       ├── routes/
│       │   ├── authRoutes.js         # register / login / me
│       │   ├── budgetRoutes.js       # get/set total + category budgets
│       │   ├── expenseRoutes.js      # CRUD + delete-all
│       │   ├── incomeRoutes.js       # CRUD for received money
│       │   └── scanRoutes.js         # file upload → AI categorize → save
│       ├── services/
│       │   ├── fileParserService.js  # pdf/csv/docx/txt/xlsx → raw text
│       │   ├── aiService.js          # OpenAI call + rule-based fallback
│       │   ├── emailService.js       # nodemailer (Gmail) sender
│       │   └── budgetAlertService.js # 50/80/100% threshold logic
│       └── utils/categories.js       # default categories + fallback keywords
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── .env.example
    └── src/
        ├── main.jsx / App.jsx
        ├── api/axios.js              # axios instance + auth header
        ├── context/AuthContext.jsx   # login/register/logout state
        ├── pages/
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   └── Dashboard.jsx
        └── components/
            ├── Navbar.jsx
            ├── BudgetSettings.jsx     # total + category budget form
            ├── UploadDocument.jsx     # scan widget
            ├── AddExpenseForm.jsx     # manual add
            ├── ExpenseList.jsx        # delete icon + delete-all
            ├── IncomeBlock.jsx        # received-amount block
            └── CategoryAreaChart.jsx  # % breakdown area chart
```

---

## 2. Install & run

**Requirements:** Node.js 20.19+ or 22.12+ (required by Vite 7), and a MongoDB database (local or Atlas).

```bash
# Backend
cd backend
npm install
cp .env.example .env        # then fill in the values (see section 3)
npm run dev                  # http://localhost:5000

# Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                  # http://localhost:5173
```

Open `http://localhost:5173` — Home → Sign up → Dashboard.

---

## 3. Environment variables & getting real API keys

### MongoDB (`MONGO_URI`)
- **Local:** install MongoDB Community Server, then use `mongodb://127.0.0.1:27017/budget-app`.
- **Free cloud option:** create a free cluster at https://www.mongodb.com/cloud/atlas →
  Database Access (create a user) → Network Access (allow your IP) →
  "Connect" → copy the `mongodb+srv://...` string into `MONGO_URI`.

### JWT (`JWT_SECRET`)
Any long random string. Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### OpenAI (`OPENAI_API_KEY`) — powers the AI document scanning
1. Go to https://platform.openai.com and sign up / log in.
2. Add a payment method under **Settings → Billing** (the API is pay-as-you-go;
   `gpt-4o-mini`, which this project uses, is very cheap per request).
3. Go to https://platform.openai.com/api-keys → **Create new secret key**.
4. Copy the key (starts with `sk-...`) into `OPENAI_API_KEY` in `backend/.env`.
   You only see it once — if you lose it, just create a new one.

**What happens when the key runs out, is invalid, or hits its quota?**
The app **does not break**. `aiService.js` wraps every OpenAI call in a
try/catch — on any failure (missing key, expired key, 429 quota exceeded,
network error) it automatically falls back to a free, local, keyword-based
categorizer (`utils/categories.js`) that still extracts amounts and assigns
a category from line text. You'll see a small note on the scan result
("Categorized with the offline rule-based categorizer") instead of an error.
You can also force this mode anytime for testing by setting `AI_DISABLED=true`.

### Gmail alert emails (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)
Gmail blocks plain passwords for apps, so you need an **App Password**:
1. Turn on 2-Step Verification on the Gmail account: https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password (name it e.g. "Pocket Ledger"), and copy the
   16-character code it gives you (no spaces) into `GMAIL_APP_PASSWORD`.
4. Put the full Gmail address into `GMAIL_USER`.

If these are left blank, the app still works — `emailService.js` just skips
sending and logs a warning instead of crashing.

---

## 4. How the features map to the code

| Feature you asked for | Where it lives |
|---|---|
| Home / Login / Register / Dashboard pages | `frontend/src/pages/*` + `App.jsx` routes |
| Manual expense add | `AddExpenseForm.jsx` → `POST /api/expenses` |
| Scan PDF/CSV/DOCX/TXT/XLSX | `UploadDocument.jsx` → `POST /api/scan/upload` → `fileParserService.js` → `aiService.js` |
| Categorization (food, tea & coffee, insurance, investment, travel, shopping, entertainment **+ more**) | `utils/categories.js` (`DEFAULT_CATEGORIES` has 15 categories, more than the original list, and new ones invented by the AI/fallback are auto-added) |
| Save to MongoDB & display | `models/Expense.js`, `ExpenseList.jsx`, `CategoryAreaChart.jsx` |
| Area chart, % of total | `CategoryAreaChart.jsx` (Recharts `AreaChart`) |
| Set total budget; category budgets can't exceed total | `BudgetSettings.jsx` (client check) + `budgetRoutes.js` (server check — this is the one that actually enforces it) |
| Email at 50/80/100% | `budgetAlertService.js` + `emailService.js`, triggered after every expense add (manual or scanned) |
| Received amount kept separate, not counted as expense | `models/Income.js` + `incomeRoutes.js` + `IncomeBlock.jsx` — entirely separate collection/endpoint from `Expense` |
| Delete icon per item / Delete all | `ExpenseList.jsx` → `DELETE /api/expenses/:id` and `DELETE /api/expenses/all` |

---

## 6. Troubleshooting

### `E11000 duplicate key error ... index: userId_1 dup key: { userId: null }`
This means your MongoDB `budgets` collection has a leftover index on a field called `userId` that doesn't match this app's schema (which uses `user`). Since no document actually sets `userId`, every doc after the first collides on `userId: null`.

**Fix:** Atlas → your cluster → Browse Collections → `budgets` → **Indexes** tab → delete the `userId_1` index. The app is also now self-healing against this (`getOrCreateBudget` in `budgetAlertService.js` retries and gives a clear error instead of crashing), but the index itself should still be removed.

Also check your `MONGO_URI` includes a real database name (e.g. `.../budget-app?retryWrites=...`) — if it's missing, MongoDB silently uses a database called `test`, which is more likely to collide with stray collections/indexes like this one.

### Budget alert emails (50/80/100%) not arriving
Check your Render logs right after an expense pushes you over a threshold — the app logs one of these three lines every time, which tells you exactly what's happening:
- `📧 Sent X% budget alert to ...` — it sent; check spam, and double-check the address
- `❌ Failed to send budget alert email: ...` — it tried and Gmail rejected it; the message will say why (almost always an auth error from a Gmail App Password that was pasted **with the spaces Google displays it with** — it must be 16 characters, no spaces)
- `⚠️ Gmail credentials not set` — `GMAIL_USER`/`GMAIL_APP_PASSWORD` aren't set on Render (your local `.env` doesn't count — set them in Render's Environment tab too)

Also remember: alerts only fire once you've set a **Total monthly budget > 0** in Budget Settings — with no total budget set, there's nothing to cross 50/80/100% of.

## 7. Notes & known limitations
- Auth uses a JWT in `localStorage` for simplicity. For production, prefer an
  httpOnly cookie to reduce XSS risk.
- The `xlsx` (SheetJS) npm package has a known, currently-unpatched advisory
  (prototype pollution / ReDoS on malicious files). It's fine for personal
  use; if you want to harden it later, only accept files from trusted users
  or swap in `exceljs`.
- Recharts is pinned to v2 for stability with this code; v3 exists if you
  want to upgrade later (check their migration guide first).
- This is an MVP you can extend — e.g. add OCR for scanned image receipts,
  multi-currency, or recurring expenses.

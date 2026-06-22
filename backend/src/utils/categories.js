// Base categories every new user starts with. This is deliberately a bigger
// list than "food, tea & coffee, insurance, investment, travel, shopping,
// entertainment" - extra everyday buckets are included so scanned expenses
// have a sensible home even if they don't match the original list.
const DEFAULT_CATEGORIES = [
  "Food",
  "Tea & Coffee",
  "Groceries",
  "Insurance",
  "Investment",
  "Travel",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Rent",
  "Health & Medical",
  "Education",
  "Subscriptions",
  "Personal Care",
  "Others",
];

// Used by the rule-based fallback categorizer (no AI required).
// Keys are lowercase keyword fragments, values are the category they map to.
const KEYWORD_MAP = {
  swiggy: "Food",
  zomato: "Food",
  restaurant: "Food",
  cafe: "Tea & Coffee",
  coffee: "Tea & Coffee",
  tea: "Tea & Coffee",
  starbucks: "Tea & Coffee",
  grocery: "Groceries",
  groceries: "Groceries",
  bigbasket: "Groceries",
  supermarket: "Groceries",
  insurance: "Insurance",
  lic: "Insurance",
  policy: "Insurance",
  mutual: "Investment",
  stock: "Investment",
  sip: "Investment",
  zerodha: "Investment",
  groww: "Investment",
  uber: "Travel",
  ola: "Travel",
  flight: "Travel",
  irctc: "Travel",
  train: "Travel",
  fuel: "Travel",
  petrol: "Travel",
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  mall: "Shopping",
  netflix: "Entertainment",
  prime: "Entertainment",
  spotify: "Entertainment",
  movie: "Entertainment",
  pvr: "Entertainment",
  electricity: "Utilities",
  "water bill": "Utilities",
  wifi: "Utilities",
  broadband: "Utilities",
  "mobile recharge": "Utilities",
  rent: "Rent",
  hospital: "Health & Medical",
  pharmacy: "Health & Medical",
  medicine: "Health & Medical",
  doctor: "Health & Medical",
  tuition: "Education",
  course: "Education",
  udemy: "Education",
  salon: "Personal Care",
  spa: "Personal Care",
};

function guessCategoryFromText(text = "") {
  const lower = text.toLowerCase();
  for (const keyword in KEYWORD_MAP) {
    if (lower.includes(keyword)) return KEYWORD_MAP[keyword];
  }
  return "Others";
}

module.exports = { DEFAULT_CATEGORIES, KEYWORD_MAP, guessCategoryFromText };

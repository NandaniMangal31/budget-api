const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("⚠️  Gmail credentials not set - budget alert emails are disabled.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

async function sendBudgetAlertEmail(toEmail, { threshold, totalSpent, totalBudget }) {
  const t = getTransporter();
  if (!t) return; // silently skip if email isn't configured - never breaks the app

  const percent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const subjectByThreshold = {
    50: "You've used 50% of your budget",
    80: "Heads up: 80% of your budget is used",
    100: "Budget limit reached (100%)",
  };

  const mailOptions = {
    from: `"Budget Tracker" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: subjectByThreshold[threshold] || "Budget alert",
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>${subjectByThreshold[threshold]}</h2>
        <p>You have spent <strong>₹${totalSpent.toFixed(2)}</strong> out of your
        <strong>₹${totalBudget.toFixed(2)}</strong> total budget (${percent}%).</p>
        <p>Log in to your dashboard to review your expenses by category.</p>
      </div>
    `,
  };

  try {
    await t.sendMail(mailOptions);
    console.log(`📧 Sent ${threshold}% budget alert to ${toEmail}`);
  } catch (err) {
    // Email failures should never crash a request - just log it.
    console.error("❌ Failed to send budget alert email:", err.message);
  }
}

module.exports = { sendBudgetAlertEmail };

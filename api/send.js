const nodemailer = require("nodemailer");

const MAX_PER_REQUEST = 10; // keep each call short for serverless time limits
const DELAY_MS = 400; // small pause between sends
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// **words** in the message become bold. One line at a time, no other formatting.
const BOLD_RE = /\*\*(?=\S)(.*?\S)\*\*/g;
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const toHtml = (msg) =>
  msg
    .replace(/[&<>]/g, (c) => ESCAPES[c]) // typed text must never act as HTML
    .replace(BOLD_RE, "<strong>$1</strong>")
    .replace(/\r?\n/g, "<br>\n");
const toText = (msg) => msg.replace(BOLD_RE, "$1");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { GMAIL_USER, GMAIL_APP_PASSWORD, FROM_NAME, ACCESS_KEY } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !ACCESS_KEY) {
    return res.status(500).json({ error: "Server env vars not configured" });
  }
  if (req.headers["x-access-key"] !== ACCESS_KEY) {
    return res.status(401).json({ error: "Wrong access key" });
  }

  const { subject, message, recipients } = req.body || {};
  if (!subject || !message || !Array.isArray(recipients) || !recipients.length) {
    return res.status(400).json({ error: "subject, message and recipients are required" });
  }
  if (recipients.length > MAX_PER_REQUEST) {
    return res.status(400).json({ error: `Max ${MAX_PER_REQUEST} recipients per request` });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, "") }, // Google shows the password with spaces
  });

  const results = [];
  for (const to of recipients) {
    if (typeof to !== "string" || !EMAIL_RE.test(to)) {
      results.push({ to, ok: false, error: "Invalid email" });
      continue;
    }
    try {
      await transporter.sendMail({
        from: `"${FROM_NAME || "Sender"}" <${GMAIL_USER}>`,
        to, // one recipient per email
        subject,
        text: toText(message),
        html: toHtml(message),
      });
      results.push({ to, ok: true });
    } catch (err) {
      results.push({ to, ok: false, error: err.message });
    }
    await sleep(DELAY_MS);
  }
  res.status(200).json({ results });
};

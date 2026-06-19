const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST   || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) return; // Email not configured — silently skip
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || "Universe App <noreply@universe.app>",
      to, subject, html,
    });
  } catch (err) {
    console.error("Email error:", err.message);
  }
}

function reminderHtml({ name, items }) {
  const rows = items.map(i =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${i.title}</td>
         <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#7c3aed">${i.due}</td></tr>`
  ).join("");
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
      <h2 style="color:#7c3aed;margin:0 0 8px">⏰ Upcoming Deadlines</h2>
      <p style="color:#64748b;margin:0 0 20px">Hi ${name}, here's what's due in the next 24 hours:</p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#7c3aed;color:#fff">
          <th style="padding:10px 12px;text-align:left">Item</th>
          <th style="padding:10px 12px;text-align:left">Due</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">You can manage your notifications in Universe App Settings.</p>
    </div>`;
}

module.exports = { sendEmail, reminderHtml };

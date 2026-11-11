// backend/src/services/emailService.js
// Sends invoice reminder emails via SMTP (nodemailer).
// Gracefully degrades: if SMTP is not configured, the caller should
// fall back to a mailto: link handled by the frontend.

const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || SMTP_USER.includes('your_')) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

/**
 * Parses a generated reminder text so a "Subject: ..." line becomes the
 * email subject instead of appearing in the body.
 */
function splitSubjectAndBody(reminderText) {
  const lines = reminderText.split('\n');
  if (lines[0] && /subject\s*:/i.test(lines[0])) {
    const subject = lines[0].replace(/subject\s*:\s*/i, '').trim();
    return { subject, body: lines.slice(1).join('\n').trim() };
  }
  return {
    subject: 'Friendly Payment Reminder',
    body: reminderText
  };
}

/**
 * Sends a reminder email. Returns { sent: true } on success, or
 * { sent: false, reason: 'SMTP_NOT_CONFIGURED' } when email is not set up
 * so the frontend can offer a mailto: fallback.
 */
async function sendReminderEmail({ to, subject, body }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to,
    subject,
    text: body
  });

  return { sent: true };
}

module.exports = {
  sendReminderEmail,
  splitSubjectAndBody
};

const nodemailer = require('nodemailer');

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, text }) {
  if (!to) return { skipped: true, reason: 'no-email' };
  const transport = getTransport();
  if (!transport) {
    console.log(`[EMAIL STUB] to=${to} subject=${subject}\n${text}`);
    return { skipped: true, reason: 'smtp-not-configured' };
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'karwakf@karnataka.gov.in',
    to,
    subject,
    text,
  });
  return { skipped: false };
}

function smsStub(mobile, text) {
  console.log(`[SMS STUB] to=${mobile} :: ${text}`);
}

module.exports = { sendEmail, smsStub };

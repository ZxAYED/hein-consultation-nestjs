import * as nodemailer from 'nodemailer';

export async function sendVerificationEmail(
  to: string,
  subject: string,
  html: string, // এখন parameter HTML
) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpFrom = process.env.SMTP_FROM ?? smtpUser;

  if (!smtpUser || !smtpPass || !smtpFrom || Number.isNaN(smtpPort)) {
    return {
      success: false,
      skipped: true,
      error: 'SMTP configuration missing',
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: smtpFrom,
    to,
    subject,
    html, // এখানে text নয়, html ব্যবহার হবে
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true, info };
  } catch (error: unknown) {
    console.error('Email error:', error);
    const message = error instanceof Error ? error.message : 'Email error';
    return { success: false, error: message };
  }
}

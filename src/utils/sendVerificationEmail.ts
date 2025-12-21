import * as nodemailer from 'nodemailer';

export async function sendVerificationEmail(
  to: string,
  subject: string,
  html: string, // এখন parameter HTML
) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error('SMTP environment variables missing');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: user,
    to,
    subject,
    html, // এখানে text নয়, html ব্যবহার হবে
  };

  await transporter.sendMail(mailOptions);
}

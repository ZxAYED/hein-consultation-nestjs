import * as nodemailer from 'nodemailer';

export async function sendVerificationEmail(
  to: string,
  subject: string,
  html: string, // এখন parameter HTML
) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'mdhumayunkabirbd333@gmail.com',
      pass: 'mzmzzgsqgcslgsid',
    },
  });

  const mailOptions = {
    from: 'mdhumayunkabirbd333@gmail.com',
    to,
    subject,
    html, // এখানে text নয়, html ব্যবহার হবে
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true, info };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
}

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (email, link) => {
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Reset Your Password",
    html: `
      <h2>Reset Password</h2>
      <p>Click the button below to reset your password.</p>

      <a href="${link}" style="
        display:inline-block;
        padding:12px 20px;
        background:#2563eb;
        color:white;
        text-decoration:none;
        border-radius:6px;
      ">
        Reset Password
      </a>

      <p>Or copy this link:</p>
      <p>${link}</p>

      <p>This link expires in 15 minutes.</p>
    `,
  });
};

module.exports = sendResetEmail;
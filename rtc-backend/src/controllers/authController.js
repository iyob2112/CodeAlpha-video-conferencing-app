// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const sendOtp = require("../utils/sendOtp");
const jwt = require("jsonwebtoken");



// REGISTER
exports.register = async (req, res) => {
  const { email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    email,
    password: hashedPassword,
    otp,
    otpExpires: Date.now() + 10 * 60 * 1000,
  });

  await sendOtp(email, otp);

  res.json({ message: "OTP sent to email" });
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ message: "User not found" });

  if (user.otp !== otpCode) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (user.otpExpires < Date.now()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;

  await user.save();

  const token = generateToken(user._id);

  res.json({
    access_token: token,
    user: {
      id: user._id,
      email: user.email,
    },
  });
};

// RESEND OTP
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendOtp(email, otp);

  res.json({ message: "OTP resent" });
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  if (!user.isVerified) {
    return res.status(400).json({ message: "Please verify your email first" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = generateToken(user._id);

  res.json({
    access_token: token,
    user: {
      id: user._id,
      email: user.email,
    },
  });
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(decoded.id, {
      password: hashedPassword,
    });

    res.json({
      message: "Password reset successfully",
    });
  } catch (err) {
    res.status(400).json({
      message: "Invalid or expired reset token",
    });
  }
};

const sendResetEmail = require("../utils/sendResetEmail");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Generate reset token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create reset link
    const link = `http://localhost:5173/reset-password?token=${token}`;

    // Send email
    await sendResetEmail(user.email, link);

    res.json({
      message: "Password reset email sent successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message,
    });
  }
};
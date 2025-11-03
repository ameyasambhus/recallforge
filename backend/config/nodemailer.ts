import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config()

// Log environment variables to verify they're loaded
console.log("=== NODEMAILER CONFIG ===");
console.log("SMTP_USER:", process.env.SMTP_USER ? "✓ Set" : "✗ MISSING");
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "✓ Set" : "✗ MISSING");
console.log("SENDER_EMAIL:", process.env.SENDER_EMAIL ? "✓ Set" : "✗ MISSING");
console.log("========================");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default transporter;

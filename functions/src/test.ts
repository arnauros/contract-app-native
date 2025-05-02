import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

async function testEmail() {
  try {
    console.log("Sending test email...");
    console.log("Using email:", process.env.GMAIL_EMAIL);

    const mailOptions = {
      from: `Contracts <${process.env.GMAIL_EMAIL}>`,
      to: "arnauros22@gmail.com", // Updated test email
      subject: "Test Contract Email",
      html: `
        <div style="font-family: sans-serif;">
          <h2>Hello Test User,</h2>
          <p>This is a test email from the contract system.</p>
          <div style="margin: 24px 0;">
            <a href="https://example.com/test" style="
              background-color: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
            ">
              View Test Contract
            </a>
          </div>
          <p>This is a test email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Run the test
testEmail();

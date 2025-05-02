/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall } from "firebase-functions/v2/https";
import * as FormData from "form-data";
import fetch from "node-fetch";
import { defineString } from "firebase-functions/params";

// Define Mailgun config
const mailgunApiKey = defineString("MAILGUN_API_KEY", {
  default: "b435842f7437f0fb2818a1a0e3e8b196-17c877d7-ff484a60",
});
const mailgunDomain = defineString("MAILGUN_DOMAIN", {
  default: "sandbox279fc87d02ca45039c0753c4a182130c.mailgun.org",
});

// Simple test email function
export const sendTestEmail = onCall(async () => {
  console.log("🔄 Starting sendTestEmail function");

  try {
    const MAILGUN_API_KEY = mailgunApiKey.value();
    const MAILGUN_DOMAIN = mailgunDomain.value();
    const MAILGUN_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

    console.log("📧 Using Mailgun endpoint:", MAILGUN_URL);
    console.log(
      "📧 Using Mailgun API key:",
      MAILGUN_API_KEY.substring(0, 5) + "..."
    );

    const formData = new FormData();
    formData.append("from", `Macu Studio <postmaster@${MAILGUN_DOMAIN}>`);
    formData.append("to", "arnauros22@gmail.com");
    formData.append("subject", "Test Email from Macu Studio");
    formData.append(
      "text",
      `This is a test email sent at: ${new Date().toISOString()}`
    );

    console.log("📧 Sending email to arnauros22@gmail.com");

    const response = await fetch(MAILGUN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString(
          "base64"
        )}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log("📬 Mailgun Response:", responseText);

    if (!response.ok) {
      throw new Error(`Mailgun error: ${responseText}`);
    }

    return { success: true, result: JSON.parse(responseText) };
  } catch (error: any) {
    console.error("❌ Error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

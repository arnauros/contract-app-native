/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, HttpsOptions } from "firebase-functions/v2/https";
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
// Optional custom email domain
const customEmailDomain = defineString("CUSTOM_EMAIL_DOMAIN", {
  default: "",
});
// From name and email
const emailFromName = defineString("EMAIL_FROM_NAME", {
  default: "Macu Studio",
});

// CORS configuration for the functions
const corsConfig: HttpsOptions = {
  cors: [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://freelancenextjs.vercel.app",
    "https://*.vercel.app",
    "https://*.macustudio.com", // Add your production domain
  ],
};

// Improved HTML email template with better deliverability features
const createEmailHtml = (
  nameRecipient: string,
  finalViewUrl: string,
  contractTitle?: string
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contract for Review${
        contractTitle ? `: ${contractTitle}` : ""
      }</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333333;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" cellspacing="0" cellpadding="0" border="0">
              <!-- Header -->
              <tr>
                <td style="background-color: #F97316; padding: 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Contract Ready for Review</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px 20px;">
                  <h2 style="margin-top: 0;">Hello ${nameRecipient},</h2>
                  <p style="margin-bottom: 20px; line-height: 1.5;">A contract has been shared with you for review and signature. Please click the button below to view and sign the document.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${finalViewUrl}" style="display: inline-block; background-color: #F97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
                      View and Sign Contract
                    </a>
                  </div>
                  
                  <p style="line-height: 1.5;">If the button above doesn't work, copy and paste this URL into your browser:</p>
                  <p style="margin-bottom: 20px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
                    ${finalViewUrl}
                  </p>
                  
                  <p style="line-height: 1.5; margin-bottom: 0;">This link will expire in 7 days. If you have any questions, please contact the sender directly.</p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 14px; color: #666666;">This email was sent via Macu Studio Contract System</p>
                  <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">Please add our email to your address book to prevent our emails from going to spam.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Simple test email function
export const sendTestEmail = onCall(corsConfig, async () => {
  console.log("🔄 Starting sendTestEmail function");

  try {
    const MAILGUN_API_KEY = mailgunApiKey.value();
    const MAILGUN_DOMAIN = mailgunDomain.value();
    const MAILGUN_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
    const CUSTOM_DOMAIN = customEmailDomain.value();
    const FROM_NAME = emailFromName.value();

    // Use custom domain if provided, otherwise use Mailgun sandbox
    const fromDomain = CUSTOM_DOMAIN || MAILGUN_DOMAIN;
    const fromEmail = `${FROM_NAME} <${
      CUSTOM_DOMAIN
        ? `contracts@${CUSTOM_DOMAIN}`
        : `postmaster@${MAILGUN_DOMAIN}`
    }>`;

    console.log("📧 Using Mailgun endpoint:", MAILGUN_URL);
    console.log("📧 Using from email:", fromEmail);
    console.log(
      "📧 Using Mailgun API key:",
      MAILGUN_API_KEY.substring(0, 5) + "..."
    );

    const formData = new FormData();
    formData.append("from", fromEmail);
    formData.append("to", "arnauros22@gmail.com");
    formData.append("subject", "Test Email from Macu Studio");
    formData.append(
      "html",
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test Email</h2>
        <p>This is a test email sent at: ${new Date().toISOString()}</p>
        <p>If you're seeing this, email sending is working correctly!</p>
        <p>Please check that this email isn't in your spam folder. If it is, mark it as "Not Spam" to improve future deliverability.</p>
      </div>
      `
    );
    formData.append(
      "text",
      `This is a test email sent at: ${new Date().toISOString()}\n\nIf you're seeing this, email sending is working correctly!\n\nPlease check that this email isn't in your spam folder. If it is, mark it as "Not Spam" to improve future deliverability.`
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

// Function to send contract emails
export const sendContractEmail = onCall(corsConfig, async (request) => {
  console.log("🔄 Starting sendContractEmail function");

  const { to, clientName, contractId, viewUrl, contractTitle, htmlContent } =
    request.data;

  if (!to || !clientName || !contractId || !viewUrl) {
    throw new Error("Missing required parameters");
  }

  try {
    const MAILGUN_API_KEY = mailgunApiKey.value();
    const MAILGUN_DOMAIN = mailgunDomain.value();
    const MAILGUN_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
    const CUSTOM_DOMAIN = customEmailDomain.value();
    const FROM_NAME = emailFromName.value();

    // Use custom domain if provided, otherwise use Mailgun sandbox
    const fromDomain = CUSTOM_DOMAIN || MAILGUN_DOMAIN;
    const fromEmail = `${FROM_NAME} <${
      CUSTOM_DOMAIN
        ? `contracts@${CUSTOM_DOMAIN}`
        : `postmaster@${MAILGUN_DOMAIN}`
    }>`;

    console.log("📧 Using Mailgun endpoint:", MAILGUN_URL);
    console.log("📧 Sending contract email to:", to);
    console.log("📧 Using from email:", fromEmail);

    const formData = new FormData();
    formData.append("from", fromEmail);
    formData.append("to", to);
    formData.append(
      "subject",
      `Contract for Review: ${contractTitle || "New Contract"}`
    );

    // Use provided HTML content if available, otherwise generate it
    const emailHtml =
      htmlContent || createEmailHtml(clientName, viewUrl, contractTitle);
    formData.append("html", emailHtml);

    // Add plain text version for better deliverability
    formData.append(
      "text",
      `Hello ${clientName},\n\nA contract has been shared with you for review and signature.\n\nTo view and sign the contract, visit: ${viewUrl}\n\nThis link will expire in 7 days.\n\nIf you have any questions, please contact the sender directly.\n\n- ${FROM_NAME} Contract System`
    );

    // Add DKIM and tracking settings for better deliverability
    formData.append("o:dkim", "yes");
    formData.append("o:tracking", "yes");
    formData.append("o:tracking-clicks", "yes");
    formData.append("o:tracking-opens", "yes");

    // Add tags for better monitoring
    formData.append("o:tag", "contract-email");

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

    return {
      success: true,
      result: JSON.parse(responseText),
      message:
        "Contract email sent successfully. If not found in inbox, please check spam folder.",
    };
  } catch (error: any) {
    console.error("❌ Error sending contract email:", error);
    throw new Error(`Failed to send contract email: ${error.message}`);
  }
});

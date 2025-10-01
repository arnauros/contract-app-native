import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { initFirebase } from "@/lib/firebase/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { completeTutorialStep } from "@/lib/tutorial/tutorialUtils";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Function to get user's custom email templates
const getUserEmailTemplates = async (userId: string) => {
  try {
    const firestore = getFirestore();
    const userDoc = await getDoc(doc(firestore, "users", userId));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.emailTemplates || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user email templates:", error);
    return null;
  }
};

// Function to replace template variables
const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
) => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  });
  return result;
};

// Default HTML email template (fallback)
const createDefaultEmailHtml = (
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
                <td style="background-color: #2563eb; padding: 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Contract Ready for Review</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px 20px;">
                  <h2 style="margin-top: 0;">Hello ${nameRecipient},</h2>
                  <p style="margin-bottom: 20px; line-height: 1.5;">A contract has been shared with you for review and signature. Please click the button below to view and sign the document.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${finalViewUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
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

export async function POST(request: Request) {
  try {
    console.log("📧 sendContract API route called");

    // Parse request body and log it
    const body = await request.json();
    console.log("📧 Request body:", JSON.stringify(body, null, 2));

    const {
      to,
      clientName,
      clientEmail,
      contractId,
      viewUrl,
      contractTitle,
      content,
      signature,
      viewToken,
    } = body;

    // Log each individual field for debugging
    console.log("Field validation:");
    console.log("- to:", to);
    console.log("- clientName:", clientName);
    console.log("- clientEmail:", clientEmail);
    console.log("- contractId:", contractId);
    console.log("- viewUrl:", viewUrl);
    console.log("- viewToken:", viewToken);

    // Use clientEmail as fallback for 'to' and vice versa
    const emailRecipient = to || clientEmail;
    const nameRecipient = clientName;

    console.log("Final values after fallbacks:");
    console.log("- Email recipient:", emailRecipient);
    console.log("- Name recipient:", nameRecipient);

    // Validate required fields
    if (!emailRecipient || !nameRecipient || !contractId) {
      console.error("❌ Missing required fields:", {
        emailRecipient,
        nameRecipient,
        contractId,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify and construct view URL if needed
    // Prefer /contract-view route which is explicitly allowed in middleware
    let finalViewUrl = viewUrl;
    if (!finalViewUrl) {
      const origin = request.headers.get("origin") || "http://localhost:3000";

      // Use contract-view path which is guaranteed to be allowed in middleware
      finalViewUrl = `${origin}/contract-view/${contractId}`;

      // Add token if available
      if (viewToken) {
        finalViewUrl += `?token=${viewToken}`;
      }
    }

    // Make sure URL doesn't have double slashes (except for protocol)
    finalViewUrl = finalViewUrl.replace(/([^:])\/\//g, "$1/");

    console.log("📧 Using view URL:", finalViewUrl);

    // Initialize Firebase
    console.log("🔥 Initializing Firebase");
    const { app } = initFirebase();
    const db = getFirestore(app);

    try {
      // Update contract status and client info in Firestore
      console.log("🔥 Updating contract in Firestore:", contractId);
      const contractRef = doc(db, "contracts", contractId);

      const updateData: any = {
        status: "pending",
        clientEmail: emailRecipient,
        clientName: nameRecipient,
        sentAt: new Date().toISOString(),
      };

      // Add designer email if available from request body
      if (body.designerEmail) {
        updateData.designerEmail = body.designerEmail;
      }

      // Add viewToken if provided
      if (viewToken) {
        updateData.viewToken = viewToken;
      }

      await updateDoc(contractRef, updateData);
      console.log("✅ Firestore update successful");

      // Track tutorial action for contract sending
      if (userId) {
        try {
          await completeTutorialStep(userId, "send_contract");
        } catch (error) {
          console.warn("Failed to complete tutorial step:", error);
        }
      }
    } catch (firestoreError) {
      console.error("❌ Firestore error:", firestoreError);
      // Continue with email sending even if Firestore update fails
    }

    let emailSent = false;

    // Try to get user's custom email templates
    let htmlContent: string;
    let emailSubject: string;

    // Get user ID from the contract to fetch custom templates
    let userId: string | null = null;
    try {
      const contractDoc = await getDoc(doc(db, "contracts", contractId));
      if (contractDoc.exists()) {
        const contractData = contractDoc.data();
        userId = contractData.userId || contractData.designerId;
      }
    } catch (error) {
      console.warn("Could not get user ID from contract:", error);
    }

    // Try to load custom email templates if we have a user ID
    let customTemplates = null;
    if (userId) {
      customTemplates = await getUserEmailTemplates(userId);
    }

    if (customTemplates && customTemplates.contractInvite) {
      console.log("📧 Using custom email template for contract invite");

      // Replace template variables
      const variables = {
        recipientName: nameRecipient,
        contractTitle: contractTitle || "Contract",
        contractUrl: finalViewUrl,
      };

      htmlContent = replaceTemplateVariables(
        customTemplates.contractInvite.html,
        variables
      );
      emailSubject = replaceTemplateVariables(
        customTemplates.contractInvite.subject,
        variables
      );
    } else {
      // Use default template
      console.log("📧 Using default email template");
      htmlContent = createDefaultEmailHtml(
        nameRecipient,
        finalViewUrl,
        contractTitle
      );
      emailSubject = `Contract Ready for Signature${
        contractTitle ? `: ${contractTitle}` : ""
      }`;
    }

    // Try Resend first if API key is configured
    if (process.env.RESEND_API_KEY) {
      try {
        console.log("📧 Attempting to send via Resend");

        // Customize the 'from' address if available from environment
        const fromEmail =
          process.env.EMAIL_FROM || "Contracts <onboarding@resend.dev>";

        // Send email via Resend
        const email = await resend.emails.send({
          from: fromEmail,
          to: [emailRecipient],
          subject: emailSubject,
          html: htmlContent,
          // Add text version for better deliverability
          text: `Hello ${nameRecipient},\n\nA contract has been shared with you for review and signature.\n\nTo view and sign the contract, visit: ${finalViewUrl}\n\nThis link will expire in 7 days.\n\nIf you have any questions, please contact the sender directly.\n\n- Macu Studio Contract System`,
        });

        console.log("✅ Email sent via Resend:", email);
        emailSent = true;
      } catch (resendError) {
        console.error("❌ Resend email failed:", resendError);
        console.log("⚠️ Will try Firebase function next");
      }
    } else {
      console.log("⚠️ No Resend API key configured, falling back to Firebase");
    }

    // If Resend failed or API key not configured, try Firebase Function
    if (!emailSent) {
      try {
        console.log("🔥 Attempting to send via Firebase function");
        // Send the email using Firebase function as a fallback
        const functions = getFunctions(undefined, "us-central1");
        const sendContractEmail = httpsCallable(functions, "sendContractEmail");

        console.log("🔥 Calling Firebase function with params:", {
          to: emailRecipient,
          clientName: nameRecipient,
          contractId,
          viewUrl: finalViewUrl,
          contractTitle,
        });

        const result = await sendContractEmail({
          to: emailRecipient,
          clientName: nameRecipient,
          contractId,
          viewUrl: finalViewUrl,
          contractTitle,
          // Pass the HTML content to ensure consistent template
          htmlContent,
        });

        console.log("✅ Email sent via Firebase function:", result);
        emailSent = true;
      } catch (firebaseError: any) {
        console.error("❌ Firebase function error:", firebaseError);
        throw new Error(
          `Firebase email sending failed: ${
            firebaseError.message || JSON.stringify(firebaseError)
          }`
        );
      }
    }

    if (!emailSent) {
      throw new Error("Failed to send email through any method");
    }

    return NextResponse.json({
      success: true,
      message:
        "Email sent successfully. Please check your inbox or spam folder.",
      viewUrl: finalViewUrl,
    });
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    let errorMessage = "Failed to send email";

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("❌ Error stack:", error.stack);
    } else {
      console.error("❌ Unknown error type:", error);
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initFirebase } from "@/lib/firebase/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

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

// Email templates for different notification types
const createSignatureNotificationHtml = (
  recipientName: string,
  signerName: string,
  contractTitle: string,
  contractId: string,
  notificationType: "designer_signed" | "client_signed" | "contract_complete"
) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const contractUrl = `${baseUrl}/Contracts/${contractId}`;

  let headerColor = "#2563eb";
  let headerText = "Contract Update";
  let mainMessage = "";
  let buttonText = "View Contract";
  let buttonColor = "#2563eb";

  switch (notificationType) {
    case "designer_signed":
      headerColor = "#059669";
      headerText = "Designer Signed Contract";
      mainMessage = `Great news! ${signerName} has signed the contract "${contractTitle}". The contract is now ready for your signature.`;
      break;
    case "client_signed":
      headerColor = "#059669";
      headerText = "Client Signed Contract";
      mainMessage = `Excellent! ${signerName} has signed the contract "${contractTitle}". Your contract is now fully executed.`;
      break;
    case "contract_complete":
      headerColor = "#7C3AED";
      headerText = "Contract Fully Executed";
      mainMessage = `🎉 Congratulations! The contract "${contractTitle}" has been fully executed with all signatures complete.`;
      buttonText = "View Completed Contract";
      buttonColor = "#7C3AED";
      break;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${headerText}</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333333;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" cellspacing="0" cellpadding="0" border="0">
              <!-- Header -->
              <tr>
                <td style="background-color: ${headerColor}; padding: 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${headerText}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px 20px;">
                  <h2 style="margin-top: 0;">Hello ${recipientName},</h2>
                  <p style="margin-bottom: 20px; line-height: 1.5;">${mainMessage}</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${contractUrl}" style="display: inline-block; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
                      ${buttonText}
                    </a>
                  </div>
                  
                  <p style="line-height: 1.5;">If the button above doesn't work, copy and paste this URL into your browser:</p>
                  <p style="margin-bottom: 20px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
                    ${contractUrl}
                  </p>
                  
                  <p style="line-height: 1.5; margin-bottom: 0;">Thank you for using Macu Studio Contract System.</p>
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
    console.log("📧 sendNotification API route called");

    const body = await request.json();
    console.log("📧 Notification request body:", JSON.stringify(body, null, 2));

    const {
      to,
      recipientName,
      signerName,
      contractId,
      contractTitle,
      notificationType,
    } = body;

    // Validate required fields
    if (
      !to ||
      !recipientName ||
      !signerName ||
      !contractId ||
      !notificationType
    ) {
      console.error("❌ Missing required fields:", {
        to,
        recipientName,
        signerName,
        contractId,
        notificationType,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get contract details and user ID if not provided
    let finalContractTitle = contractTitle;
    let userId: string | null = null;

    try {
      const firestore = getFirestore();
      const contractRef = doc(firestore, "contracts", contractId);
      const contractDoc = await getDoc(contractRef);

      if (contractDoc.exists()) {
        const contractData = contractDoc.data();
        if (!finalContractTitle) {
          finalContractTitle = contractData.title || "Contract";
        }
        userId = contractData.userId || contractData.designerId;
      }
    } catch (error) {
      console.warn("Could not fetch contract details:", error);
      if (!finalContractTitle) {
        finalContractTitle = "Contract";
      }
    }

    // Try to load custom email templates
    let customTemplates = null;
    if (userId) {
      customTemplates = await getUserEmailTemplates(userId);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const contractUrl = `${baseUrl}/Contracts/${contractId}`;

    // Map notification type to template key
    const templateMap: Record<string, string> = {
      designer_signed: "designerSigned",
      client_signed: "clientSigned",
      contract_complete: "contractComplete",
    };

    const templateKey = templateMap[notificationType as string];
    let htmlContent: string;
    let emailSubject: string;

    // Try to use custom template if available
    if (customTemplates && templateKey && customTemplates[templateKey]) {
      console.log(`📧 Using custom email template for ${notificationType}`);

      const variables = {
        recipientName,
        signerName,
        contractTitle: finalContractTitle,
        contractUrl,
      };

      htmlContent = replaceTemplateVariables(
        customTemplates[templateKey].html,
        variables
      );
      emailSubject = replaceTemplateVariables(
        customTemplates[templateKey].subject,
        variables
      );
    } else {
      // Use default template
      console.log(`📧 Using default email template for ${notificationType}`);
      htmlContent = createSignatureNotificationHtml(
        recipientName,
        signerName,
        finalContractTitle,
        contractId,
        notificationType
      );
      emailSubject = getNotificationSubject(
        notificationType,
        finalContractTitle
      );
    }

    let emailSent = false;

    // Try Resend first if API key is configured
    if (process.env.RESEND_API_KEY) {
      try {
        console.log("📧 Attempting to send notification via Resend");

        const fromEmail =
          process.env.EMAIL_FROM || "Contracts <onboarding@resend.dev>";

        const email = await resend.emails.send({
          from: fromEmail,
          to: [to],
          subject: emailSubject,
          html: htmlContent,
          text: getNotificationText(
            recipientName,
            signerName,
            finalContractTitle,
            contractId,
            notificationType
          ),
        });

        console.log("✅ Notification email sent via Resend:", email);
        emailSent = true;
      } catch (resendError) {
        console.error("❌ Resend notification email failed:", resendError);
        console.log("⚠️ Will try Firebase function next");
      }
    } else {
      console.log("⚠️ No Resend API key configured, falling back to Firebase");
    }

    // If Resend failed or API key not configured, try Firebase Function
    if (!emailSent) {
      try {
        console.log("📧 Attempting to send notification via Firebase function");

        const functions = getFunctions(undefined, "us-central1");
        const sendContractEmail = httpsCallable(functions, "sendContractEmail");

        await sendContractEmail({
          to,
          clientName: recipientName,
          contractId,
          viewUrl: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/Contracts/${contractId}`,
          contractTitle: finalContractTitle,
          htmlContent,
        });

        console.log("✅ Notification email sent via Firebase function");
        emailSent = true;
      } catch (firebaseError) {
        console.error(
          "❌ Firebase function notification email failed:",
          firebaseError
        );
        throw new Error("Failed to send notification email");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notification email sent successfully",
      method: emailSent ? "resend" : "firebase",
    });
  } catch (error) {
    console.error("❌ Error in sendNotification API:", error);
    return NextResponse.json(
      {
        error: "Failed to send notification email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getNotificationSubject(
  notificationType: string,
  contractTitle: string
): string {
  switch (notificationType) {
    case "designer_signed":
      return `Designer Signed: ${contractTitle}`;
    case "client_signed":
      return `Client Signed: ${contractTitle}`;
    case "contract_complete":
      return `Contract Complete: ${contractTitle}`;
    default:
      return `Contract Update: ${contractTitle}`;
  }
}

function getNotificationText(
  recipientName: string,
  signerName: string,
  contractTitle: string,
  contractId: string,
  notificationType: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const contractUrl = `${baseUrl}/Contracts/${contractId}`;

  let message = "";

  switch (notificationType) {
    case "designer_signed":
      message = `Great news! ${signerName} has signed the contract "${contractTitle}". The contract is now ready for your signature.`;
      break;
    case "client_signed":
      message = `Excellent! ${signerName} has signed the contract "${contractTitle}". Your contract is now fully executed.`;
      break;
    case "contract_complete":
      message = `🎉 Congratulations! The contract "${contractTitle}" has been fully executed with all signatures complete.`;
      break;
    default:
      message = `Contract "${contractTitle}" has been updated.`;
  }

  return `Hello ${recipientName},\n\n${message}\n\nTo view the contract, visit: ${contractUrl}\n\nThank you for using Macu Studio Contract System.`;
}

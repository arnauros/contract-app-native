import { NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Add your verified emails here
const VERIFIED_EMAILS = [
  "hello@arnau.design",
  // add any other verified emails
];

export async function POST(request: Request) {
  console.log("🔑 Checking Resend API key:", !!process.env.RESEND_API_KEY);

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY is not configured");
    return NextResponse.json(
      { error: "Email service not configured - missing API key" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log("📧 Received request to send contract:", body);

    const { clientName, clientEmail, content, signature } = body;

    // Check if email is verified in development
    if (
      process.env.NODE_ENV === "development" &&
      !VERIFIED_EMAILS.includes(clientEmail)
    ) {
      return NextResponse.json(
        {
          error: `In development mode, you can only send to verified emails: ${VERIFIED_EMAILS.join(
            ", "
          )}`,
          verifiedEmails: VERIFIED_EMAILS,
        },
        { status: 400 }
      );
    }

    // In development, always send to verified email
    const toEmail =
      process.env.NODE_ENV === "development" ? VERIFIED_EMAILS[0] : clientEmail;

    console.log(
      `📤 Sending email to ${toEmail} (${process.env.NODE_ENV} mode)`
    );

    const { data, error } = await resend.emails.send({
      from: "Contracts <onboarding@resend.dev>",
      to: [toEmail],
      subject: "Your Contract Agreement",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Contract Agreement</h1>
          ${
            process.env.NODE_ENV === "development"
              ? `<p style="color: #666; background: #f4f4f4; padding: 8px; border-radius: 4px;">
              Development Mode - Original recipient would have been: ${clientEmail}
            </p>`
              : ""
          }
          <p>Dear ${clientName},</p>
          <p>Please find your signed contract agreement below:</p>
          <div style="margin: 20px 0; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            ${content}
          </div>
          ${
            signature
              ? `
            <div style="margin-top: 20px;">
              <p style="margin-bottom: 10px;">Signed by: ${clientName}</p>
              <img src="${signature}" alt="Signature" style="max-width: 200px;" />
            </div>
          `
              : ""
          }
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend API error:", error);
      return NextResponse.json(
        { error: `Email service error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("✅ Email sent successfully:", data);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === "development"
            ? `Contract sent to ${VERIFIED_EMAILS[0]} (development mode)`
            : "Contract sent successfully",
        id: data?.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ General API error:", error);
    return NextResponse.json(
      { error: "Internal server error while sending contract" },
      { status: 500 }
    );
  }
}

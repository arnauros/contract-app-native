import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { initFirebase } from "@/lib/firebase/firebase";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, clientName, contractId, viewUrl } = await request.json();

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Initialize Firebase
    const { app } = initFirebase();
    const db = getFirestore(app);

    // Update contract status and client info in Firestore
    const contractRef = doc(db, "contracts", contractId);
    await updateDoc(contractRef, {
      status: "pending",
      clientEmail: to,
      clientName: clientName,
      sentAt: new Date().toISOString(),
    });

    // Send email
    const email = await resend.emails.send({
      from: "Contracts <onboarding@resend.dev>", // Update this with your verified domain
      to: [to],
      subject: "Contract Ready for Signature",
      html: `
        <div style="font-family: sans-serif;">
          <h2>Hello ${clientName},</h2>
          <p>A contract has been shared with you for review and signature.</p>
          <div style="margin: 24px 0;">
            <a href="${viewUrl}" style="
              background-color: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
            ">
              View and Sign Contract
            </a>
          </div>
          <p>This link will expire in 7 days.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, messageId: email.data?.id });
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
  );

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export async function GET(request: Request) {
  try {
    // Get email ID from query parameters
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get("id");

    if (!emailId) {
      return new NextResponse("Email ID is required", { status: 400 });
    }

    // Update email tracking info in Firestore
    await db.collection("emailTracking").doc(emailId).update({
      opened: true,
      openedAt: new Date(),
    });

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    return new NextResponse(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error tracking email:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

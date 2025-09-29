import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin safely
const adminInitialized = initAdmin();
const db = adminInitialized ? getFirestore() : null;

export async function GET(request: Request) {
  try {
    // Get email ID from query parameters
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get("id");

    if (!emailId) {
      return new NextResponse("Email ID is required", { status: 400 });
    }

    // Update email tracking info in Firestore (if admin is initialized)
    if (db) {
      await db.collection("emailTracking").doc(emailId).update({
        opened: true,
        openedAt: new Date(),
      });
    } else {
      console.log("Firebase Admin not initialized, skipping email tracking");
    }

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

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Get current user data
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User document not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Update user document with subscription_debug: true
    await db.collection("users").doc(userId).update({
      subscription_debug: true,
      updatedAt: new Date(),
    });

    console.log("✅ Enabled subscription_debug for user:", userId);

    return NextResponse.json({
      success: true,
      message: "Development bypass enabled successfully",
      userId: userId,
      subscription_debug: true,
    });
  } catch (error) {
    console.error("Error enabling dev bypass:", error);
    return NextResponse.json(
      { error: "Failed to enable development bypass" },
      { status: 500 }
    );
  }
}

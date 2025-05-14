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

    // Prepare claims based on user data
    let claims: Record<string, any> = {
      // Default claims
      subscriptionStatus: "free",
      subscriptionTier: "free",
    };

    // Check if user has subscription
    if (userData?.subscription) {
      const subscription = userData.subscription;
      const isActive = ["active", "trialing"].includes(subscription.status);

      if (isActive) {
        claims = {
          ...claims,
          subscriptionStatus: subscription.status,
          subscriptionTier: subscription.tier || "pro",
          subscriptionId: subscription.subscriptionId,
        };
      }
    }

    // Set admin status if the user is an admin
    if (userData?.isAdmin) {
      claims.isAdmin = true;
    }

    // Set the updated claims
    await auth.setCustomUserClaims(userId, claims);

    // Get updated user
    const updatedUser = await auth.getUser(userId);
    const updatedClaims = updatedUser.customClaims || {};

    // Return the user information and updated claims
    return NextResponse.json({
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      customClaims: updatedClaims,
      message: "Claims reset successfully",
    });
  } catch (error) {
    console.error("Error resetting user claims:", error);
    return NextResponse.json(
      { error: "Failed to reset user claims" },
      { status: 500 }
    );
  }
}

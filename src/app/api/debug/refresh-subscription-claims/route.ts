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

    // Prepare claims based on subscription status
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
      } else if (subscription.status === "canceled") {
        // For canceled subscriptions, ensure we set the right claims
        claims = {
          ...claims,
          subscriptionStatus: "canceled",
          subscriptionTier: "free",
          // Keep the subscription ID for reference
          subscriptionId: subscription.subscriptionId,
        };
      }
    }

    // Preserve admin status if the user is an admin
    if (userData?.isAdmin) {
      claims.isAdmin = true;
    }

    // Get current claims before updating
    const currentUser = await auth.getUser(userId);
    const currentClaims = currentUser.customClaims || {};

    // Log what we're changing for debugging
    console.log("Updating claims:", {
      from: currentClaims,
      to: claims,
    });

    // Set the updated claims
    await auth.setCustomUserClaims(userId, claims);

    // Get updated user to confirm changes
    const updatedUser = await auth.getUser(userId);
    const updatedClaims = updatedUser.customClaims || {};

    // Return the user information and updated claims
    return NextResponse.json({
      success: true,
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      previousClaims: currentClaims,
      newClaims: updatedClaims,
      message: "Subscription claims updated successfully",
    });
  } catch (error) {
    console.error("Error updating subscription claims:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update subscription claims",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

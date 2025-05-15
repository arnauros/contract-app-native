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
    let subscriptionStatus = "free";
    let isActive = false;
    if (userData?.subscription) {
      const subscription = userData.subscription;
      isActive = ["active", "trialing"].includes(subscription.status);

      if (isActive) {
        subscriptionStatus = subscription.status;
        claims = {
          ...claims,
          subscriptionStatus: subscription.status,
          subscriptionTier: subscription.tier || "pro",
          subscriptionId: subscription.subscriptionId,
        };
      } else {
        // If subscription exists but is not active, use its status (e.g., "canceled")
        subscriptionStatus = subscription.status;
        claims.subscriptionStatus = subscription.status;
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

    // Create response
    const responseData = {
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      customClaims: updatedClaims,
      message: "Claims reset successfully",
    };

    // Create response with cookie
    const response = NextResponse.json(responseData);

    // Set subscription cookie based on the subscription status
    // Always use 'active' if the subscription is active, regardless of the status value
    // This fixes issues when a user cancels and then resubscribes
    const cookieValue = isActive ? "active" : subscriptionStatus;

    console.log(`Setting subscription_status cookie to: ${cookieValue}`);

    response.cookies.set("subscription_status", cookieValue, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error resetting user claims:", error);
    return NextResponse.json(
      { error: "Failed to reset user claims" },
      { status: 500 }
    );
  }
}

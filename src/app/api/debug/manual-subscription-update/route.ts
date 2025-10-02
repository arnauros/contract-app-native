import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase/admin";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@/lib/stripe/config";

// Initialize Firebase Admin
const admin = initAdmin();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if Firebase Admin is initialized
    if (!admin) {
      return NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 500 }
      );
    }

    const db = getFirestore();
    const auth = getAuth();

    // Find user by email in Firestore
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json(
        { error: "User not found with email", email },
        { status: 404 }
      );
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Find Stripe customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: "No Stripe customer found with email", email },
        { status: 404 }
      );
    }

    const customer = customers.data[0];
    
    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "No active subscriptions found for customer", customerId: customer.id },
        { status: 404 }
      );
    }

    const activeSubscription = subscriptions.data[0];

    // Update user document with subscription data
    const subscriptionData = {
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status,
      customerId: customer.id,
      tier: "pro",
      currentPeriodEnd: activeSubscription.current_period_end,
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
    };

    await db.collection("users").doc(userId).update({
      subscription: subscriptionData,
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    });

    // Update custom claims
    try {
      const userRecord = await auth.getUser(userId);
      const existingClaims = userRecord.customClaims || {};

      await auth.setCustomUserClaims(userId, {
        ...existingClaims,
        subscriptionStatus: activeSubscription.status,
        subscriptionTier: "pro",
        subscriptionId: activeSubscription.id,
      });
    } catch (claimsError) {
      console.error("Failed to update custom claims:", claimsError);
    }

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully",
      userId,
      email,
      customerId: customer.id,
      subscriptionId: activeSubscription.id,
      subscriptionData,
    });
  } catch (error) {
    console.error("Error in manual subscription update:", error);
    return NextResponse.json(
      {
        error: "Failed to update subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

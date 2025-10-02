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
    const { userId, email } = await req.json();

    if (!userId && !email) {
      return NextResponse.json(
        { error: "User ID or email is required" },
        { status: 400 }
      );
    }

    // Check if Firebase Admin is initialized
    if (!admin) {
      return NextResponse.json(
        {
          error: "Firebase Admin not initialized",
          isDevelopment: process.env.NODE_ENV === "development",
        },
        { status: 500 }
      );
    }

    const db = getFirestore();
    let userDoc;
    let userIdToUse = userId;

    // Find user by email if userId not provided
    if (!userId && email) {
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

      userDoc = usersSnapshot.docs[0];
      userIdToUse = userDoc.id;
    } else {
      userDoc = await db.collection("users").doc(userId).get();
    }

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found", userId: userIdToUse },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;
    const stripeCustomerId = userData?.stripeCustomerId;

    // Check Stripe directly if we have a customer ID
    let stripeSubscriptions: any[] = [];
    if (stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 10,
        });
        stripeSubscriptions = subscriptions.data;
      } catch (stripeError) {
        console.error("Error fetching Stripe subscriptions:", stripeError);
      }
    }

    // Check for customers by email in Stripe
    let stripeCustomers = [];
    if (email) {
      try {
        const customers = await stripe.customers.list({
          email: email,
          limit: 10,
        });
        stripeCustomers = customers.data;
      } catch (stripeError) {
        console.error("Error fetching Stripe customers:", stripeError);
      }
    }

    return NextResponse.json({
      userId: userIdToUse,
      email: userData?.email,
      firestoreData: {
        hasSubscription: !!subscription,
        subscription: subscription || null,
        stripeCustomerId: stripeCustomerId || null,
        isAdmin: userData?.isAdmin || false,
      },
      stripeData: {
        customerId: stripeCustomerId,
        subscriptions: stripeSubscriptions.map((sub) => ({
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
        })),
        customers: stripeCustomers.map((customer) => ({
          id: customer.id,
          email: customer.email,
        })),
      },
      analysis: {
        hasActiveSubscription:
          subscription?.status === "active" ||
          subscription?.status === "trialing",
        hasStripeSubscription: stripeSubscriptions.some(
          (sub) => sub.status === "active" || sub.status === "trialing"
        ),
        needsUpdate: !subscription && stripeSubscriptions.length > 0,
      },
    });
  } catch (error) {
    console.error("Error in user subscription debug:", error);
    return NextResponse.json(
      {
        error: "Failed to debug user subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

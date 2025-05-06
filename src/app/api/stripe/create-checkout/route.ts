import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(req: Request) {
  try {
    // Check if domain is app.local or localhost in development
    const hostname = req.headers.get("host") || "";
    const isLocalhost =
      hostname.includes("localhost") || hostname.includes("127.0.0.1");
    const isAppLocal = hostname === "app.local";
    const isDev = process.env.NODE_ENV === "development";

    // Allow on app.local OR localhost during development
    const isAllowedHost = isAppLocal || (isDev && isLocalhost);

    // Only allow this API to be called from allowed hosts
    if (!isAllowedHost) {
      return NextResponse.json(
        {
          error:
            "This API is only available on app.local or localhost in development",
        },
        { status: 403 }
      );
    }

    const { priceId, userId } = await req.json();

    // Validate price ID
    if (
      ![STRIPE_PRICE_IDS.MONTHLY, STRIPE_PRICE_IDS.YEARLY].includes(priceId)
    ) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Get user from Firebase
    const auth = getAuth();
    const user = await auth.getUser(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          firebaseUID: userId,
        },
      });

      customerId = customer.id;

      // Save Stripe customer ID to Firestore
      await db.collection("users").doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Determine subscription type
    const isMonthly = priceId === STRIPE_PRICE_IDS.MONTHLY;
    const interval = isMonthly ? "month" : "year";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout_canceled=true`,
      metadata: {
        userId,
        interval,
      },
      subscription_data: {
        metadata: {
          userId,
          interval,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

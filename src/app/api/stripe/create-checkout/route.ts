import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";

// Initialize Stripe with better error handling
const initStripe = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error(
      "Missing Stripe secret key. Check your environment variables."
    );
    return null;
  }

  try {
    return new Stripe(stripeKey, {
      apiVersion: "2025-04-30.basil", // Use the required API version
    });
  } catch (error) {
    console.error("Error initializing Stripe:", error);
    return null;
  }
};

const stripe = initStripe();

export async function POST(req: Request) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not properly configured" },
        { status: 500 }
      );
    }

    // Check if running in development mode
    const isDev = process.env.NODE_ENV === "development";

    // Always allow in development mode
    if (!isDev) {
      // In production, check for allowed domains
      const hostname = req.headers.get("host") || "";
      const isAllowedHost =
        hostname === "app.local" ||
        hostname.includes("your-production-domain.com");

      if (!isAllowedHost) {
        return NextResponse.json(
          {
            error: "This API is only available on allowed domains",
          },
          { status: 403 }
        );
      }
    }

    const { priceId, userId } = await req.json();

    console.log("Creating checkout session with:", { priceId, userId });
    console.log("Available price IDs:", STRIPE_PRICE_IDS);

    // Validate price ID - allow hardcoded fallbacks
    if (
      ![STRIPE_PRICE_IDS.MONTHLY, STRIPE_PRICE_IDS.YEARLY].includes(priceId) &&
      !priceId.startsWith("price_")
    ) {
      return NextResponse.json(
        {
          error: "Invalid price ID",
          providedId: priceId,
          availableIds: STRIPE_PRICE_IDS,
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user from Firebase
    const auth = getAuth();
    let user;

    try {
      user = await auth.getUser(userId);
    } catch (error) {
      console.error("Error getting user:", error);
      return NextResponse.json(
        { error: "Invalid user ID or user not found" },
        { status: 404 }
      );
    }

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

      // Save Stripe customer ID to Firestore using set with merge
      // This will handle both cases: document exists or not
      try {
        await db.collection("users").doc(userId).set(
          {
            stripeCustomerId: customerId,
            email: user.email,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log("Updated user document with Stripe customer ID");
      } catch (dbError) {
        console.error("Error updating user document:", dbError);
        // Continue with the checkout even if saving to DB fails
      }
    }

    // Determine subscription type
    const isMonthly = priceId === STRIPE_PRICE_IDS.MONTHLY;
    const interval = isMonthly ? "month" : "year";

    // Get app URL with fallback
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (isDev ? "http://localhost:3000" : "https://app.local");

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
      success_url: `${appUrl}/pricing?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout_canceled=true`,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create checkout session", details: errorMessage },
      { status: 500 }
    );
  }
}

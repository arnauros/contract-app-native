import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
const adminInitialized = initAdmin();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

export async function POST(req: Request) {
  try {
    // Check hostname with better detection for local development
    const hostname = req.headers.get("host") || "";
    console.log("Request hostname (portal):", hostname);

    const isDev = process.env.NODE_ENV === "development";

    // More comprehensive local development hostname detection
    const isLocalDevelopment =
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      hostname.includes("vercel.app") ||
      hostname.includes("arnau.design") ||
      (isDev && hostname.match(/localhost:\d+/));

    if (!isLocalDevelopment && !isDev) {
      return NextResponse.json(
        {
          error:
            "This API is only available in development or on approved domains",
          hostname,
        },
        { status: 403 }
      );
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.error("Stripe is not configured - missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Stripe is not configured correctly on the server" },
        { status: 500 }
      );
    }

    // Parse request body
    let userId: string;
    try {
      const body = await req.json();
      userId = body.userId;
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    console.log(`Getting Stripe customer for user: ${userId}`);

    // Make sure Firebase Admin is initialized
    if (!adminInitialized) {
      console.error("Firebase Admin is not initialized");
      return NextResponse.json(
        {
          error:
            "Firebase Admin not configured. Please set up FIREBASE_SERVICE_ACCOUNT_KEY for production use.",
          details:
            "This endpoint requires Firebase Admin SDK to access user data",
        },
        { status: 500 }
      );
    }

    try {
      // Get user's Stripe customer ID from Firestore
      const db = getFirestore();

      try {
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          return NextResponse.json(
            {
              error: "User not found",
              details: `No document found at users/${userId}`,
              help: "Create a user document with this ID in Firestore",
            },
            { status: 404 }
          );
        }

        const userData = userDoc.data();

        if (!userData?.stripeCustomerId) {
          return NextResponse.json(
            {
              error: "No Stripe customer found",
              details: `User document exists but has no stripeCustomerId field`,
              userFields: Object.keys(userData || {}),
              help: "Add a stripeCustomerId field to the user document",
            },
            { status: 404 }
          );
        }

        console.log(`Found customer: ${userData.stripeCustomerId}`);

        // Check if the Stripe customer ID starts with "mock_" - this should not happen in production
        if (userData.stripeCustomerId.startsWith("mock_")) {
          return NextResponse.json(
            {
              error: "Mock customer ID detected",
              details: `User has mock customer ID: ${userData.stripeCustomerId}`,
              help: "Create a real Stripe customer for this user",
            },
            { status: 400 }
          );
        }

        // Real Stripe customer, create a portal session
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: userData.stripeCustomerId,
            return_url: `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/dashboard`,
          });

          return NextResponse.json({ url: session.url });
        } catch (stripeError: any) {
          console.error("Stripe portal error:", stripeError);

          // Check for specific configuration error
          if (
            stripeError.message &&
            stripeError.message.includes("configuration")
          ) {
            // Determine if we're in live or test mode
            const isLiveMode =
              process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
            const portalUrl = isLiveMode
              ? "https://dashboard.stripe.com/settings/billing/portal"
              : "https://dashboard.stripe.com/test/settings/billing/portal";

            return NextResponse.json(
              {
                error: stripeError.message,
                details: `Your ${isLiveMode ? "live" : "test"} mode customer portal configuration is missing. Please configure it in your Stripe dashboard.`,
                helpUrl: portalUrl,
                mode: isLiveMode ? "live" : "test",
              },
              { status: 400 }
            );
          }

          // For other Stripe errors
          return NextResponse.json(
            {
              error: "Stripe error when creating customer portal session",
              details: stripeError.message,
            },
            { status: 500 }
          );
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        return NextResponse.json(
          {
            error: "Database error when retrieving customer",
            details: String(firestoreError),
            help: "Check Firebase permissions and network connectivity",
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          details: String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
const adminInitialized = initAdmin();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-04-30.basil",
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
      (isDev && hostname.match(/localhost:\d+/));

    // In development, allow all hostnames
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

      if (isDev) {
        // In development, we'll mock the Stripe customer portal
        return NextResponse.json({
          url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/dashboard?mockStripePortal=true&t=${Date.now()}`,
          _devNote: "This is a mock URL for development only",
        });
      }

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

      if (isDev) {
        // In development, we'll mock the Stripe customer portal
        return NextResponse.json({
          url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/dashboard?mockStripePortal=true&t=${Date.now()}`,
          _devNote:
            "This is a mock URL for development only - Firebase Admin not initialized",
        });
      }

      return NextResponse.json(
        { error: "Server configuration error: Firebase Admin not initialized" },
        { status: 500 }
      );
    }

    try {
      // Get user's Stripe customer ID from Firestore
      const db = getFirestore();

      try {
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          if (isDev) {
            // In development, provide a mock customer portal if the document doesn't exist
            return NextResponse.json({
              url: `${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
              }/dashboard?mockStripePortal=true&t=${Date.now()}`,
              _devNote: "This is a mock URL for development - user not found",
            });
          }

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
          if (isDev) {
            // In development, provide a mock customer portal if stripeCustomerId doesn't exist
            return NextResponse.json({
              url: `${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
              }/dashboard?mockStripePortal=true&userId=${userId}&t=${Date.now()}`,
              _devNote:
                "This is a mock URL for development - no Stripe customer ID",
            });
          }

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

        // Check if we're in development mode and the Stripe customer ID starts with "mock_"
        if (isDev && userData.stripeCustomerId.startsWith("mock_")) {
          // For mock customers, return a mock portal URL
          return NextResponse.json({
            url: `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/dashboard?mockStripePortal=true&userId=${userId}&t=${Date.now()}`,
            _devNote: "This is a mock URL for a mock customer",
          });
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
            return NextResponse.json(
              {
                error: stripeError.message,
                details:
                  "Your test mode customer portal configuration is missing. Please configure it in your Stripe dashboard.",
                helpUrl:
                  "https://dashboard.stripe.com/test/settings/billing/portal",
              },
              { status: 400 }
            );
          }

          // For other Stripe errors
          if (isDev) {
            // In development, provide a mock URL on Stripe errors
            return NextResponse.json({
              url: `${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
              }/dashboard?mockStripePortal=true&error=${encodeURIComponent(
                stripeError.message
              )}&t=${Date.now()}`,
              _devNote: "This is a mock URL due to a Stripe error",
              error: stripeError.message,
            });
          }

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

        if (isDev) {
          // In development, provide a mock URL on Firestore errors
          return NextResponse.json({
            url: `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/dashboard?mockStripePortal=true&error=firestoreError&t=${Date.now()}`,
            _devNote: "This is a mock URL due to Firestore error",
            error: String(firestoreError),
          });
        }

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
      if (isDev) {
        // In development, provide a mock URL on general errors
        return NextResponse.json({
          url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/dashboard?mockStripePortal=true&error=general&t=${Date.now()}`,
          _devNote: "This is a mock URL due to a general error",
          error: String(error),
        });
      }

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

    if (process.env.NODE_ENV === "development") {
      // Final fallback for development mode
      return NextResponse.json({
        url: `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/dashboard?mockStripePortal=true&error=uncaught&t=${Date.now()}`,
        _devNote: "This is a mock URL due to an uncaught error",
        error: String(error),
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

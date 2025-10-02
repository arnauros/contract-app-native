import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
    console.log("Request hostname (portal-client):", hostname);

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
      return NextResponse.json(
        { error: "Stripe is not configured correctly on the server" },
        { status: 500 }
      );
    }

    // Parse request body
    let userId: string;
    let stripeCustomerId: string;
    try {
      const body = await req.json();
      userId = body.userId;
      stripeCustomerId = body.stripeCustomerId;
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    if (!userId || !stripeCustomerId) {
      return NextResponse.json(
        { error: "Missing userId or stripeCustomerId parameter" },
        { status: 400 }
      );
    }

    console.log(`Creating portal session for customer: ${stripeCustomerId}`);

    // Check if the Stripe customer ID starts with "mock_" - this should not happen in production
    if (stripeCustomerId.startsWith("mock_")) {
      return NextResponse.json(
        {
          error: "Mock customer ID detected",
          details: `User has mock customer ID: ${stripeCustomerId}`,
          help: "Create a real Stripe customer for this user",
        },
        { status: 400 }
      );
    }

    // Real Stripe customer, create a portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
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
      return NextResponse.json(
        {
          error: "Stripe error when creating customer portal session",
          details: stripeError.message,
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

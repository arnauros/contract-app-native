import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
  timeout: 20000,
  maxNetworkRetries: 3,
});

export async function POST(req: NextRequest) {
  try {
    // Validate content type is application/json
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content type must be application/json" },
        { status: 415 }
      );
    }

    // Check hostname with better detection for local development
    const hostname = req.headers.get("host") || "";
    console.log("Upgrade API - Request hostname:", hostname);

    const isDev = process.env.NODE_ENV === "development";

    // More comprehensive local development hostname detection
    const isLocalDevelopment =
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      hostname.includes("vercel.app") ||
      (isDev && hostname.match(/localhost:\d+/));

    // Allow localhost, vercel.app domains, and development
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

    // Parse request JSON with explicit error handling
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { userId, email } = requestData;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Upgrade API: Stripe secret key not configured");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_MONTHLY_PRICE_ID) {
      console.error("Upgrade API: Stripe price ID not configured");
      return NextResponse.json(
        { error: "Stripe price ID not configured" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error("Upgrade API: App URL not configured");
      return NextResponse.json(
        { error: "App URL not configured" },
        { status: 500 }
      );
    }

    console.log("Upgrade API: Creating checkout session for user:", userId);

    // Create Stripe customer
    let customer;
    try {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: userId,
        },
      });
      console.log("Upgrade API: Created customer:", customer.id);
    } catch (customerError) {
      console.error("Upgrade API: Failed to create customer:", customerError);
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 }
      );
    }

    // Create checkout session for Pro plan
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_MONTHLY_PRICE_ID!,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgraded=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
        metadata: {
          firebaseUID: userId,
          plan: "pro",
        },
        allow_promotion_codes: true,
      });
      console.log("Upgrade API: Created checkout session:", session.id);
    } catch (sessionError) {
      console.error(
        "Upgrade API: Failed to create checkout session:",
        sessionError
      );
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Upgrade API error:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

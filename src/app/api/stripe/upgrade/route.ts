import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: NextRequest) {
  try {
    // Get user ID and email from request body
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe not configured");
    }

    if (!process.env.STRIPE_MONTHLY_PRICE_ID) {
      throw new Error("Stripe price ID not configured");
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error("App URL not configured");
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        firebaseUID: userId,
      },
    });

    // Create checkout session for Pro plan
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      metadata: {
        firebaseUID: userId,
        plan: "pro",
      },
      allow_promotion_codes: true,
    });

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

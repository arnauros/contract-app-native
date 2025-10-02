import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: name || email,
      metadata: {
        firebase_uid: userId,
        source: "api_migration",
      },
    });

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: "Real Stripe customer created successfully",
    });
  } catch (error: any) {
    console.error("Error creating Stripe customer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}

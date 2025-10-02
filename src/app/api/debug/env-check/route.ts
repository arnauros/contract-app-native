import { NextResponse } from "next/server";

export async function GET() {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "SET" : "MISSING",
      STRIPE_MONTHLY_PRICE_ID: process.env.STRIPE_MONTHLY_PRICE_ID ? "SET" : "MISSING",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "SET" : "MISSING",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "SET" : "MISSING",
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "SET" : "MISSING",
      // Show partial values for debugging (safe to expose)
      STRIPE_SECRET_KEY_PREFIX: process.env.STRIPE_SECRET_KEY?.substring(0, 10) || "MISSING",
      STRIPE_MONTHLY_PRICE_ID_VALUE: process.env.STRIPE_MONTHLY_PRICE_ID || "MISSING",
      NEXT_PUBLIC_APP_URL_VALUE: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    };

    return NextResponse.json(envCheck);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check environment variables", details: String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@/lib/stripe/config";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export async function GET() {
  try {
    // Test basic Stripe connection
    const account = await stripe.accounts.retrieve();

    // Test price retrieval
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    let monthlyPrice = null;
    let yearlyPrice = null;

    if (monthlyPriceId) {
      try {
        monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
      } catch (error) {
        console.error("Error retrieving monthly price:", error);
      }
    }

    if (yearlyPriceId) {
      try {
        yearlyPrice = await stripe.prices.retrieve(yearlyPriceId);
      } catch (error) {
        console.error("Error retrieving yearly price:", error);
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        type: account.type,
      },
      prices: {
        monthly: monthlyPrice
          ? {
              id: monthlyPrice.id,
              amount: monthlyPrice.unit_amount,
              currency: monthlyPrice.currency,
              recurring: monthlyPrice.recurring,
              active: monthlyPrice.active,
            }
          : null,
        yearly: yearlyPrice
          ? {
              id: yearlyPrice.id,
              amount: yearlyPrice.unit_amount,
              currency: yearlyPrice.currency,
              recurring: yearlyPrice.recurring,
              active: yearlyPrice.active,
            }
          : null,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        secretKeyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
          ? "LIVE"
          : "TEST",
        publishableKeyMode:
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_")
            ? "LIVE"
            : "TEST",
      },
    });
  } catch (error) {
    console.error("Stripe connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
          hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
          hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
          secretKeyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
            ? "LIVE"
            : "TEST",
          publishableKeyMode:
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith(
              "pk_live_"
            )
              ? "LIVE"
              : "TEST",
        },
      },
      { status: 500 }
    );
  }
}

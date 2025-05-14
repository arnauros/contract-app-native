import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

// Check if a string is a Stripe test key (starting with sk_test or pk_test)
const isTestKey = (key: string) => {
  return key && (key.startsWith("sk_test_") || key.startsWith("pk_test_"));
};

// Simple function to obfuscate keys for safe logging/display
const obfuscateKey = (key: string) => {
  if (!key) return "undefined";
  if (key.length < 12) return "invalid_key_format";
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
};

export async function GET(req: Request) {
  // Security check - only allow in development or with admin auth
  const authHeader = req.headers.get("authorization");
  const isAdmin = authHeader === process.env.ADMIN_API_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  try {
    // 1. Check environment variables are set
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeMonthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const stripeYearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    const results = {
      environment: process.env.NODE_ENV,
      variables: {
        stripeSecretKey: {
          exists: !!stripeSecretKey,
          isTestKey: isTestKey(stripeSecretKey || ""),
          obfuscated: obfuscateKey(stripeSecretKey || ""),
        },
        stripePublishableKey: {
          exists: !!stripePublishableKey,
          isTestKey: isTestKey(stripePublishableKey || ""),
          obfuscated: obfuscateKey(stripePublishableKey || ""),
        },
        stripeWebhookSecret: {
          exists: !!stripeWebhookSecret,
          obfuscated: obfuscateKey(stripeWebhookSecret || ""),
        },
        stripeMonthlyPriceId: {
          exists: !!stripeMonthlyPriceId,
          value: stripeMonthlyPriceId,
        },
        stripeYearlyPriceId: {
          exists: !!stripeYearlyPriceId,
          value: stripeYearlyPriceId,
        },
      },
      tests: {
        stripeConnection: false,
        stripeCustomerCreation: false,
        stripePriceRetrieval: false,
      },
      errors: [] as string[],
    };

    // 2. Test Stripe connection
    try {
      if (!stripeSecretKey) {
        throw new Error("Stripe secret key is missing");
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-04-30.basil",
      });

      // Test retrieving Stripe account info
      const account = await stripe.accounts.retrieve("acct_current");
      results.tests.stripeConnection = true;

      // 3. Test creating a test customer
      try {
        const customer = await stripe.customers.create({
          email: `test-${Date.now()}@example.com`,
          description: "Test customer for API connection checking",
          metadata: {
            test: "true",
            createdAt: new Date().toISOString(),
          },
        });

        results.tests.stripeCustomerCreation = true;

        // Clean up - delete the test customer
        await stripe.customers.del(customer.id);
      } catch (customerError: any) {
        results.errors.push(`Customer test error: ${customerError.message}`);
      }

      // 4. Test retrieving price information
      if (stripeMonthlyPriceId) {
        try {
          const price = await stripe.prices.retrieve(stripeMonthlyPriceId);
          results.tests.stripePriceRetrieval = true;
        } catch (priceError: any) {
          results.errors.push(`Price retrieval error: ${priceError.message}`);
        }
      } else {
        results.errors.push("Monthly price ID is not set");
      }
    } catch (stripeError: any) {
      results.errors.push(`Stripe connection error: ${stripeError.message}`);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error in Stripe test route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

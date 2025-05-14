#!/usr/bin/env node

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Stripe from "stripe";

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env.local");

// Load environment variables
dotenv.config({ path: envPath });

async function verifyStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

  console.log("=== Stripe Configuration Verification ===");

  // Check if keys are defined
  if (!secretKey) {
    console.error("❌ STRIPE_SECRET_KEY is not defined in .env.local");
    process.exit(1);
  }

  if (!publishableKey) {
    console.error(
      "❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in .env.local"
    );
    process.exit(1);
  }

  if (!webhookSecret) {
    console.warn("⚠️ STRIPE_WEBHOOK_SECRET is not defined in .env.local");
  }

  // Verify key mode matching
  const isSecretKeyTest = secretKey.startsWith("sk_test_");
  const isPubKeyTest = publishableKey.startsWith("pk_test_");

  console.log(`Secret key mode: ${isSecretKeyTest ? "TEST" : "LIVE"}`);
  console.log(`Publishable key mode: ${isPubKeyTest ? "TEST" : "LIVE"}`);

  if (isSecretKeyTest !== isPubKeyTest) {
    console.error(
      "❌ Key mode mismatch! Both keys must be in the same mode (test or live)"
    );
    process.exit(1);
  }

  // Initialize Stripe
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-04-30.basil",
    });

    console.log("Connecting to Stripe API...");

    // Verify account connectivity
    const account = await stripe.account.retrieve();
    console.log(`✅ Successfully connected to Stripe account: ${account.id}`);

    // Verify price IDs
    if (monthlyPriceId) {
      try {
        const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
        console.log(`✅ Monthly price ID (${monthlyPriceId}) is valid:`);
        console.log(
          `   - Price: ${
            monthlyPrice.unit_amount / 100
          } ${monthlyPrice.currency.toUpperCase()}`
        );
        console.log(`   - Product: ${monthlyPrice.product}`);
        console.log(`   - Mode: ${monthlyPrice.livemode ? "LIVE" : "TEST"}`);

        // Check for mode mismatch
        if (monthlyPrice.livemode !== !isSecretKeyTest) {
          console.error(
            "❌ Monthly price mode mismatch! Price is in LIVE mode but using TEST API key or vice versa"
          );
        }
      } catch (error) {
        console.error(
          `❌ Invalid monthly price ID (${monthlyPriceId}):`,
          error.message
        );
      }
    } else {
      console.warn("⚠️ STRIPE_MONTHLY_PRICE_ID is not defined");
    }

    if (yearlyPriceId) {
      try {
        const yearlyPrice = await stripe.prices.retrieve(yearlyPriceId);
        console.log(`✅ Yearly price ID (${yearlyPriceId}) is valid:`);
        console.log(
          `   - Price: ${
            yearlyPrice.unit_amount / 100
          } ${yearlyPrice.currency.toUpperCase()}`
        );
        console.log(`   - Product: ${yearlyPrice.product}`);
        console.log(`   - Mode: ${yearlyPrice.livemode ? "LIVE" : "TEST"}`);

        // Check for mode mismatch
        if (yearlyPrice.livemode !== !isSecretKeyTest) {
          console.error(
            "❌ Yearly price mode mismatch! Price is in LIVE mode but using TEST API key or vice versa"
          );
        }
      } catch (error) {
        console.error(
          `❌ Invalid yearly price ID (${yearlyPriceId}):`,
          error.message
        );
      }
    } else {
      console.warn("⚠️ STRIPE_YEARLY_PRICE_ID is not defined");
    }

    console.log("\n=== Verification Complete ===");
  } catch (error) {
    console.error("❌ Error connecting to Stripe:", error.message);
    process.exit(1);
  }
}

verifyStripeConfig().catch((error) => {
  console.error("Script error:", error);
  process.exit(1);
});

#!/usr/bin/env node

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Stripe from "stripe";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env.local");

// Load environment variables
dotenv.config({ path: envPath });

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });

    console.log("Firebase Admin initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error.message);
    return false;
  }
}

async function testSubscriptionGuard() {
  console.log("=== Testing Subscription Guard Functionality ===");

  // Initialize Firebase Admin
  if (!initializeFirebaseAdmin()) {
    console.error("❌ Cannot proceed without Firebase Admin");
    process.exit(1);
  }

  // Get credentials from .env.local
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error("❌ STRIPE_SECRET_KEY is missing");
    process.exit(1);
  }

  // Create Stripe client
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-04-30.basil",
  });

  // Get Firestore instance
  const db = getFirestore();

  // 1. Find a test user in Firestore
  console.log("Looking for a test user in Firestore...");

  try {
    const usersSnapshot = await db.collection("users").limit(1).get();

    if (usersSnapshot.empty) {
      console.error("❌ No users found in Firestore");
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`✅ Found test user: ${userId}`);
    console.log(`   - Email: ${userData.email || "N/A"}`);

    // 2. Check if the user has a Stripe customer ID
    if (!userData.stripeCustomerId) {
      console.warn("⚠️ User does not have a Stripe customer ID");
    } else {
      console.log(
        `✅ User has Stripe customer ID: ${userData.stripeCustomerId}`
      );

      // Verify customer exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(
          userData.stripeCustomerId
        );
        console.log(`✅ Customer exists in Stripe: ${customer.id}`);
      } catch (error) {
        console.error(
          `❌ Failed to retrieve customer from Stripe:`,
          error.message
        );
      }
    }

    // 3. Check if user has subscription data in the user document
    if (!userData.subscription) {
      console.warn("⚠️ User does not have subscription data in Firestore");
    } else {
      console.log("✅ User has subscription data:");
      console.log(`   - Status: ${userData.subscription.status}`);
      console.log(`   - ID: ${userData.subscription.subscriptionId}`);
      console.log(`   - Tier: ${userData.subscription.tier}`);

      // Check status
      const isActive =
        userData.subscription.status === "active" ||
        userData.subscription.status === "trialing";

      console.log(`   - Is active: ${isActive ? "YES" : "NO"}`);

      // If subscription ID exists, verify in Stripe
      if (userData.subscription.subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            userData.subscription.subscriptionId
          );
          console.log(`✅ Subscription exists in Stripe: ${subscription.id}`);
          console.log(`   - Stripe status: ${subscription.status}`);

          // Check for status mismatch
          if (subscription.status !== userData.subscription.status) {
            console.warn(
              `⚠️ Status mismatch: Firestore says "${userData.subscription.status}" but Stripe says "${subscription.status}"`
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to retrieve subscription from Stripe:`,
            error.message
          );
        }
      }
    }

    // 4. Generate a test payload that the SubscriptionGuard would receive
    console.log("\n=== Simulating SubscriptionGuard Decision ===");

    const mockAuthState = {
      user: {
        uid: userId,
        email: userData.email || "test@example.com",
      },
      isAdmin: false,
      loading: false,
    };

    const mockSubscriptionState = {
      isActive:
        userData.subscription?.status === "active" ||
        userData.subscription?.status === "trialing",
      loading: false,
      error: null,
    };

    const wouldHaveAccess =
      mockAuthState.isAdmin || mockSubscriptionState.isActive;

    console.log("Auth state:");
    console.log(`   - User ID: ${mockAuthState.user.uid}`);
    console.log(`   - Is Admin: ${mockAuthState.isAdmin}`);

    console.log("Subscription state:");
    console.log(`   - Is Active: ${mockSubscriptionState.isActive}`);
    console.log(`   - Has Error: ${mockSubscriptionState.error !== null}`);

    console.log(
      `\n▶️ SubscriptionGuard would ${
        wouldHaveAccess ? "GRANT" : "DENY"
      } access`
    );

    if (!wouldHaveAccess) {
      console.log("SubscriptionGuard would redirect to pricing page");
    }

    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("Error testing subscription guard:", error);
    process.exit(1);
  }
}

testSubscriptionGuard().catch((error) => {
  console.error("Script error:", error);
  process.exit(1);
});

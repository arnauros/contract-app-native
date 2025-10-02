import admin from "firebase-admin";
import Stripe from "stripe";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

async function fixUserSubscription(email) {
  try {
    console.log(`🔍 Fixing subscription for: ${email}`);

    // Find user by email in Firestore
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (usersSnapshot.empty) {
      console.log("❌ User not found in Firestore");
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`📄 User ID: ${userId}`);
    console.log(`📧 Email: ${userData.email}`);

    // Find Stripe customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      console.log("❌ No Stripe customer found with email");
      return;
    }

    const customer = customers.data[0];
    console.log(`💳 Stripe Customer ID: ${customer.id}`);

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      console.log("❌ No active subscriptions found for customer");
      return;
    }

    const activeSubscription = subscriptions.data[0];
    console.log(`📋 Active Subscription ID: ${activeSubscription.id}`);
    console.log(`📊 Subscription Status: ${activeSubscription.status}`);

    // Update user document with subscription data
    const subscriptionData = {
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status,
      customerId: customer.id,
      tier: "pro",
      currentPeriodEnd: activeSubscription.current_period_end,
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
    };

    await db.collection("users").doc(userId).update({
      subscription: subscriptionData,
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    });

    console.log("✅ Updated user document with subscription data");

    // Update custom claims
    try {
      const userRecord = await auth.getUser(userId);
      const existingClaims = userRecord.customClaims || {};

      await auth.setCustomUserClaims(userId, {
        ...existingClaims,
        subscriptionStatus: activeSubscription.status,
        subscriptionTier: "pro",
        subscriptionId: activeSubscription.id,
      });

      console.log("✅ Updated custom claims");
    } catch (claimsError) {
      console.error("❌ Failed to update custom claims:", claimsError);
    }

    console.log("🎉 Subscription fix completed successfully!");
    console.log("📊 Final subscription data:", subscriptionData);
  } catch (error) {
    console.error("❌ Error fixing subscription:", error);
  }
}

// Run the fix
const email = process.argv[2];
if (!email) {
  console.log("Usage: node scripts/manual-subscription-fix.js <email>");
  process.exit(1);
}

fixUserSubscription(email)
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

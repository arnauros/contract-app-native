import admin from "firebase-admin";
import serviceAccount from "../firebase-service-account.json" assert { type: "json" };

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUserSubscription(email) {
  try {
    console.log(`🔍 Checking subscription status for: ${email}`);

    // Find user by email
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

    // Check subscription data
    const subscription = userData.subscription;
    if (subscription) {
      console.log("💳 Subscription data found:");
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Tier: ${subscription.tier}`);
      console.log(`   Subscription ID: ${subscription.subscriptionId}`);
      console.log(`   Customer ID: ${subscription.customerId}`);
      console.log(`   Current Period End: ${subscription.currentPeriodEnd}`);
      console.log(`   Cancel at Period End: ${subscription.cancelAtPeriodEnd}`);

      const isActive =
        subscription.status === "active" || subscription.status === "trialing";
      console.log(`   Is Active: ${isActive}`);
    } else {
      console.log("❌ No subscription data found");
    }

    // Check custom claims
    try {
      const userRecord = await admin.auth().getUser(userId);
      const customClaims = userRecord.customClaims || {};
      console.log("🔐 Custom claims:");
      console.log(
        `   Subscription Status: ${customClaims.subscriptionStatus || "none"}`
      );
      console.log(
        `   Subscription Tier: ${customClaims.subscriptionTier || "none"}`
      );
      console.log(
        `   Stripe Customer ID: ${customClaims.stripeCustomerId || "none"}`
      );
      console.log(`   Is Admin: ${customClaims.isAdmin || false}`);
    } catch (error) {
      console.log("❌ Error getting custom claims:", error.message);
    }

    // Count contracts
    const contractsSnapshot = await db
      .collection("contracts")
      .where("userId", "==", userId)
      .get();
    console.log(`📊 Contract count: ${contractsSnapshot.size}`);

    // Count invoices
    const invoicesSnapshot = await db
      .collection("invoices")
      .where("userId", "==", userId)
      .get();
    console.log(`📊 Invoice count: ${invoicesSnapshot.size}`);
  } catch (error) {
    console.error("❌ Error checking user subscription:", error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log("Usage: node check-user-subscription.js <email>");
  process.exit(1);
}

checkUserSubscription(email)
  .then(() => {
    console.log("✅ Check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

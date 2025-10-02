import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Initialize Firebase Admin
function initFirebase() {
  if (getApps().length > 0) {
    return { auth: getAuth(), db: getFirestore() };
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString(
      "utf8"
    )
  );

  initializeApp({
    credential: cert(serviceAccount),
  });

  return { auth: getAuth(), db: getFirestore() };
}

async function makeUserPremium() {
  try {
    console.log("🔧 Making user premium: hello@arnau.design");

    const { auth, db } = initFirebase();

    // Get user by email
    const userRecord = await auth.getUserByEmail("hello@arnau.design");
    const userId = userRecord.uid;

    console.log("✅ User found:", userId);

    // Create subscription data
    const subscriptionData = {
      subscriptionId: "sub_manual_" + Date.now(),
      status: "active",
      customerId: "cus_TA8eKMyfL8qqOx", // Latest customer ID
      tier: "pro",
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      cancelAtPeriodEnd: false,
    };

    // Update Firestore user document
    await db.collection("users").doc(userId).update({
      subscription: subscriptionData,
      stripeCustomerId: "cus_TA8eKMyfL8qqOx",
      updatedAt: new Date(),
    });

    console.log("✅ Updated Firestore user document");

    // Update Firebase Auth custom claims
    const existingClaims = userRecord.customClaims || {};

    await auth.setCustomUserClaims(userId, {
      ...existingClaims,
      subscriptionStatus: "active",
      subscriptionTier: "pro",
      subscriptionId: subscriptionData.subscriptionId,
      stripeCustomerId: "cus_TA8eKMyfL8qqOx",
    });

    console.log("✅ Updated Firebase Auth custom claims");

    // Verify the update
    const updatedUser = await db.collection("users").doc(userId).get();
    const userData = updatedUser.data();

    console.log("🎉 User is now premium!");
    console.log("📊 Subscription data:", userData.subscription);

    return {
      success: true,
      userId,
      subscriptionData,
    };
  } catch (error) {
    console.error("❌ Error:", error.message);
    return { success: false, error: error.message };
  }
}

makeUserPremium();

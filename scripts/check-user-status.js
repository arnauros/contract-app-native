import admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUserStatus(email) {
  try {
    console.log(`🔍 Checking status for: ${email}`);

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
    console.log(
      `💳 Stripe Customer ID: ${userData.stripeCustomerId || "Not set"}`
    );
    console.log(`📋 Subscription:`, userData.subscription || "Not set");
    console.log(
      `✅ Checkout Completed: ${userData.checkoutCompleted || false}`
    );
    console.log(`📅 Updated At: ${userData.updatedAt || "Not set"}`);

    // Check custom claims
    try {
      const userRecord = await auth.getUser(userId);
      console.log(`🔐 Custom Claims:`, userRecord.customClaims || "None");
    } catch (claimsError) {
      console.error("❌ Failed to get custom claims:", claimsError);
    }
  } catch (error) {
    console.error("❌ Error checking user status:", error);
  }
}

// Run the check
const email = process.argv[2];
if (!email) {
  console.log("Usage: node scripts/check-user-status.js <email>");
  process.exit(1);
}

checkUserStatus(email)
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

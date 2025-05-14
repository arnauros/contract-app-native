#!/usr/bin/env node

/**
 * Script to reset a user's Firebase Auth claims directly.
 *
 * Usage:
 *   node scripts/fix-user-claims.js <userId>
 *
 * Example:
 *   node scripts/fix-user-claims.js abc123xyz
 */

// Check for user ID argument
const userId = process.argv[2];

if (!userId) {
  console.error("Error: User ID is required");
  console.log("Usage: node scripts/fix-user-claims.js <userId>");
  process.exit(1);
}

// Import Firebase Admin SDK
let admin;
try {
  admin = require("firebase-admin");
} catch (error) {
  console.error("Error: firebase-admin package not found");
  console.log("Please install it with: npm install firebase-admin");
  process.exit(1);
}

// Initialize Firebase Admin with service account
try {
  const serviceAccount = require("../service-account.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin:", error.message);
  console.log(
    "Make sure you have a valid service-account.json file in the project root"
  );
  process.exit(1);
}

async function resetUserClaims() {
  const auth = admin.auth();
  const firestore = admin.firestore();

  try {
    console.log(`Fetching user data for ID: ${userId}`);

    // Get user from Auth
    const userRecord = await auth.getUser(userId);
    console.log(`User found: ${userRecord.email}`);

    // Get existing claims
    const existingClaims = userRecord.customClaims || {};
    console.log("Current claims:", existingClaims);

    // Get user document from Firestore
    const userDoc = await firestore.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log("Warning: User document not found in Firestore");
    } else {
      console.log("User document found in Firestore");

      const userData = userDoc.data();

      // Prepare claims based on user data
      let claims = {
        // Default claims
        subscriptionStatus: "free",
        subscriptionTier: "free",
      };

      // Check if user has subscription
      if (userData?.subscription) {
        const subscription = userData.subscription;
        const isActive = ["active", "trialing"].includes(subscription.status);

        if (isActive) {
          console.log(`Active subscription found: ${subscription.status}`);
          claims = {
            ...claims,
            subscriptionStatus: subscription.status,
            subscriptionTier: subscription.tier || "pro",
            subscriptionId: subscription.subscriptionId,
          };
        }
      }

      // Set admin status if the user is an admin
      if (userData?.isAdmin) {
        claims.isAdmin = true;
      }

      // Keep other non-subscription existing claims
      Object.keys(existingClaims).forEach((key) => {
        if (
          ![
            "subscriptionStatus",
            "subscriptionTier",
            "subscriptionId",
          ].includes(key)
        ) {
          claims[key] = existingClaims[key];
        }
      });

      // Set the updated claims
      console.log("Setting claims:", claims);
      await auth.setCustomUserClaims(userId, claims);

      // Verify claims were set
      const updatedUser = await auth.getUser(userId);
      console.log("Updated claims:", updatedUser.customClaims);

      console.log("✅ User claims updated successfully");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the function
resetUserClaims().then(() => {
  console.log("Done");
  process.exit(0);
});

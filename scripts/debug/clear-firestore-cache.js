#!/usr/bin/env node

/**
 * Script to clear Firestore cache for a user and update their auth claims
 * to resolve permission issues.
 *
 * Usage:
 *   node scripts/debug/clear-firestore-cache.js <userId>
 */

// Check for user ID argument
const userId = process.argv[2];

if (!userId) {
  console.error("Error: User ID is required");
  console.log("Usage: node scripts/debug/clear-firestore-cache.js <userId>");
  process.exit(1);
}

// Import Firebase Admin
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

try {
  // Try to load the service account
  const serviceAccount = require("../../service-account.json");

  // Initialize Firebase Admin with service account
  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin:", error.message);
  console.log(
    "Make sure you have a valid service-account.json file in the project root"
  );
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

// Function to check if a contract belongs to a user
async function checkContractOwnership(userId, contractId) {
  try {
    const contractRef = db.collection("contracts").doc(contractId);
    const contract = await contractRef.get();

    if (!contract.exists) {
      console.log(`Contract ${contractId} does not exist`);
      return false;
    }

    const data = contract.data();
    return data.userId === userId;
  } catch (error) {
    console.error(`Error checking contract ownership:`, error);
    return false;
  }
}

// Function to get the user's subscription status
async function getUserSubscription(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const user = await userRef.get();

    if (!user.exists) {
      console.log(`User ${userId} document not found in Firestore`);
      return null;
    }

    const userData = user.data();
    console.log(`User data:`, {
      hasSubscription: !!userData.subscription,
      subscriptionStatus: userData.subscription?.status || "none",
      isAdmin: !!userData.isAdmin,
    });

    return userData.subscription;
  } catch (error) {
    console.error(`Error getting user subscription:`, error);
    return null;
  }
}

// Function to reset the user's auth claims
async function resetUserClaims(userId) {
  try {
    // Get current user data
    const [user, subscription] = await Promise.all([
      auth.getUser(userId),
      getUserSubscription(userId),
    ]);

    // Get existing claims
    const existingClaims = user.customClaims || {};
    console.log(`Current claims:`, existingClaims);

    // Prepare new claims
    let newClaims = {
      // Default to free tier
      subscriptionStatus: "free",
      subscriptionTier: "free",
    };

    // Check for active subscription
    if (subscription && ["active", "trialing"].includes(subscription.status)) {
      console.log(`Active subscription found: ${subscription.status}`);
      newClaims = {
        ...newClaims,
        subscriptionStatus: subscription.status,
        subscriptionTier: subscription.tier || "pro",
        subscriptionId: subscription.subscriptionId,
      };
    }

    // Preserve other claims
    for (const [key, value] of Object.entries(existingClaims)) {
      if (
        !["subscriptionStatus", "subscriptionTier", "subscriptionId"].includes(
          key
        )
      ) {
        newClaims[key] = value;
      }
    }

    // Log the claims we're about to set
    console.log(`Setting claims:`, newClaims);

    // Set the claims
    await auth.setCustomUserClaims(userId, newClaims);

    // Verify claims were set correctly
    const updatedUser = await auth.getUser(userId);
    console.log(`Updated claims:`, updatedUser.customClaims);

    return true;
  } catch (error) {
    console.error(`Error resetting user claims:`, error);
    return false;
  }
}

// Function to create a test contract
async function createTestContract(userId) {
  try {
    // Create a test contract
    const contractsRef = db.collection("contracts");
    const newContract = {
      userId,
      title: "Test Contract",
      content: {
        clientName: "Test Client",
        clientEmail: "test@example.com",
        projectBrief: "This is a test contract",
        techStack: "Testing stack",
      },
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await contractsRef.add(newContract);
    console.log(`Created test contract: ${result.id}`);

    return result.id;
  } catch (error) {
    console.error(`Error creating test contract:`, error);
    return null;
  }
}

// Function to delete a contract
async function deleteContract(contractId) {
  try {
    await db.collection("contracts").doc(contractId).delete();
    console.log(`Deleted contract: ${contractId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting contract:`, error);
    return false;
  }
}

// Main function to run all steps
async function main() {
  try {
    console.log(
      `\n=== Starting permission troubleshooting for user: ${userId} ===\n`
    );

    // Step 1: Reset user claims
    console.log(`\n=== STEP 1: Resetting user claims ===`);
    const claimsReset = await resetUserClaims(userId);
    if (!claimsReset) {
      console.error(`Failed to reset user claims`);
      process.exit(1);
    }

    // Step 2: Create a test contract
    console.log(`\n=== STEP 2: Creating a test contract ===`);
    const contractId = await createTestContract(userId);
    if (!contractId) {
      console.error(`Failed to create test contract`);
      process.exit(1);
    }

    // Step 3: Verify ownership
    console.log(`\n=== STEP 3: Verifying contract ownership ===`);
    const isOwner = await checkContractOwnership(userId, contractId);
    console.log(
      `User ${userId} ${
        isOwner ? "is" : "is NOT"
      } the owner of contract ${contractId}`
    );

    // Step 4: Clean up
    console.log(`\n=== STEP 4: Cleaning up test contract ===`);
    await deleteContract(contractId);

    console.log(`\n=== Troubleshooting completed successfully ===\n`);

    console.log(`Next steps:`);
    console.log(`1. Restart your browser to ensure fresh Firebase auth tokens`);
    console.log(`2. Try accessing the dashboard again`);
    console.log(
      `3. If you still have issues, use the "Force Token Refresh" button in the debug section`
    );
  } catch (error) {
    console.error(`Error in main process:`, error);
    process.exit(1);
  } finally {
    // Exit process
    process.exit(0);
  }
}

// Run the main function
main();

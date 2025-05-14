import admin from "firebase-admin";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

// Function to reset user claims based on database data
export async function resetUserClaims(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log(`Resetting claims for user: ${userId}`);

    const auth = admin.auth();
    const firestore = admin.firestore();

    // Get user data
    const [userAuth, userDoc] = await Promise.all([
      auth.getUser(userId),
      firestore.collection("users").doc(userId).get(),
    ]);

    // Current claims
    const existingClaims = userAuth.customClaims || {};
    console.log("Current claims:", existingClaims);

    // User document may not exist
    if (!userDoc.exists) {
      console.warn(`User document does not exist for ID: ${userId}`);
      return { success: false, error: "User document not found" };
    }

    const userData = userDoc.data();
    console.log("User data:", {
      hasSubscription: !!userData.subscription,
      subscriptionStatus: userData.subscription?.status,
      isAdmin: !!userData.isAdmin,
    });

    // Prepare new claims
    let newClaims = {
      // Default values
      subscriptionStatus: "free",
      subscriptionTier: "free",
    };

    // Check for subscription data
    if (userData.subscription) {
      const subscription = userData.subscription;
      const isActive = ["active", "trialing"].includes(subscription.status);

      if (isActive) {
        console.log(`Active subscription found: ${subscription.status}`);
        newClaims = {
          ...newClaims,
          subscriptionStatus: subscription.status,
          subscriptionTier: subscription.tier || "pro",
          subscriptionId: subscription.subscriptionId,
        };
      }
    }

    // Keep admin status if present
    if (userData.isAdmin) {
      newClaims.isAdmin = true;
    }

    // Keep any other claims that are not subscription-related
    Object.keys(existingClaims).forEach((key) => {
      if (
        !["subscriptionStatus", "subscriptionTier", "subscriptionId"].includes(
          key
        ) &&
        key !== "isAdmin"
      ) {
        newClaims[key] = existingClaims[key];
      }
    });

    console.log("Setting new claims:", newClaims);

    // Set the custom claims
    await auth.setCustomUserClaims(userId, newClaims);

    // Verify the claims were set properly
    const updatedUser = await auth.getUser(userId);
    console.log("Updated claims:", updatedUser.customClaims);

    return {
      success: true,
      message: "Claims reset successfully",
      claims: updatedUser.customClaims,
    };
  } catch (error) {
    console.error("Error resetting user claims:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Function to check a user's permissions directly
export async function checkUserPermissions(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const auth = admin.auth();
    const firestore = admin.firestore();

    // Get user auth data
    const user = await auth.getUser(userId);

    // Check claims
    const claims = user.customClaims || {};
    const hasValidClaims =
      claims.subscriptionStatus === "active" ||
      claims.subscriptionStatus === "trialing";

    // Try to access a test collection with the user's ID
    let firestoreAccessWorks = false;
    try {
      const testQuery = await firestore
        .collection("contracts")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      firestoreAccessWorks = true;
    } catch (error) {
      console.error("Firestore access error:", error);
      firestoreAccessWorks = false;
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      claims,
      hasValidClaims,
      firestoreAccessWorks,
    };
  } catch (error) {
    console.error("Error checking user permissions:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

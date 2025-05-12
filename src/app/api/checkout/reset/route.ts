import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

/**
 * API route to reset checkout-related flags in the database
 * This is intended as a failsafe when checkout flags get stuck
 */
export async function POST(req: Request) {
  try {
    const { userId, checkoutId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required userId parameter" },
        { status: 400 }
      );
    }

    console.log(`Resetting checkout state for user: ${userId}`);
    const db = getFirestore();

    // Set of cleanup operations to perform
    const cleanupPromises = [];

    // Find and update any pending checkouts for this user
    const checkoutsQuery = await db
      .collection("stripe_checkouts")
      .where("userId", "==", userId)
      .where("status", "in", ["pending", "created"])
      .get();

    if (!checkoutsQuery.empty) {
      console.log(`Found ${checkoutsQuery.size} pending checkouts to clean up`);

      for (const doc of checkoutsQuery.docs) {
        // If specific checkoutId is provided, only reset that one
        if (checkoutId && doc.id !== checkoutId) {
          continue;
        }

        cleanupPromises.push(
          db.collection("stripe_checkouts").doc(doc.id).update({
            status: "abandoned",
            resetAt: new Date(),
            resetReason: "Manual API reset",
          })
        );
      }
    }

    // Also update the user record to clear any checkout-related flags
    cleanupPromises.push(
      db.collection("users").doc(userId).update({
        checkoutInProgress: false,
        lastCheckoutReset: new Date(),
      })
    );

    // Execute all cleanup operations
    await Promise.all(cleanupPromises);

    return NextResponse.json({
      success: true,
      message: "Checkout flags reset successfully",
      checkoutsReset: checkoutId ? 1 : checkoutsQuery.size,
    });
  } catch (error) {
    console.error("Error resetting checkout flags:", error);
    return NextResponse.json(
      { error: "Failed to reset checkout flags" },
      { status: 500 }
    );
  }
}

/**
 * API route to check the status of any stuck checkouts
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required userId parameter" },
        { status: 400 }
      );
    }

    console.log(`Checking checkout state for user: ${userId}`);
    const db = getFirestore();

    // Find any pending checkouts for this user
    const checkoutsQuery = await db
      .collection("stripe_checkouts")
      .where("userId", "==", userId)
      .where("status", "in", ["pending", "created"])
      .get();

    const checkouts = checkoutsQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get user record to check for checkout flags
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    return NextResponse.json({
      userId,
      pendingCheckouts: checkouts,
      userCheckoutFlags: userData
        ? {
            checkoutInProgress: userData.checkoutInProgress || false,
            lastCheckoutAttempt: userData.lastCheckoutAttempt || null,
          }
        : null,
      hasStuckCheckouts:
        checkouts.length > 0 || (userData && userData.checkoutInProgress),
    });
  } catch (error) {
    console.error("Error checking checkout status:", error);
    return NextResponse.json(
      { error: "Failed to check checkout status" },
      { status: 500 }
    );
  }
}

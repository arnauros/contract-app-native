"use client";

import { getFirestore, doc, setDoc, updateDoc } from "firebase/firestore";
import { app } from "@/lib/firebase/config";
import Cookies from "js-cookie";

/**
 * Test helpers for subscription and payment flows
 * IMPORTANT: Only use these in development mode!
 */

// Set a user's subscription status directly in Firestore and in cookies
export const setUserSubscriptionStatus = async (
  userId,
  status = "active",
  tier = "pro"
) => {
  if (process.env.NODE_ENV !== "development") {
    console.error("Test helpers can only be used in development mode");
    return;
  }

  try {
    const db = getFirestore(app);
    const now = new Date();
    const oneMonthFromNow = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );

    await updateDoc(doc(db, "users", userId), {
      subscription: {
        tier: tier,
        status: status,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: oneMonthFromNow.getTime(),
        customerId:
          "test_customer_" + Math.random().toString(36).substring(2, 7),
        subscriptionId:
          "test_sub_" + Math.random().toString(36).substring(2, 7),
      },
    });

    // Also update the subscription status cookie
    Cookies.set("subscription_status", status, {
      path: "/",
      expires: 5, // 5 days
    });

    console.log(
      `Successfully set user ${userId} subscription to ${status} (${tier})`
    );
    return true;
  } catch (error) {
    console.error("Error setting subscription status:", error);
    return false;
  }
};

// Test button component to quickly set subscription status in the UI
export const TestSubscriptionControls = ({ userId }) => {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const setSubscription = async (status, tier) => {
    await setUserSubscriptionStatus(userId, status, tier);
    alert(
      `Subscription set to ${status} (${tier}) - Refresh the page to see changes`
    );
  };

  const style = {
    position: "fixed",
    bottom: "10px",
    right: "10px",
    background: "#f0f0f0",
    border: "1px solid #ccc",
    padding: "10px",
    borderRadius: "5px",
    zIndex: 1000,
    fontSize: "12px",
  };

  const buttonStyle = {
    margin: "5px",
    padding: "5px 10px",
    background: "#e0e0e0",
    border: "1px solid #ccc",
    borderRadius: "3px",
    cursor: "pointer",
  };

  return (
    <div style={style}>
      <div>Test Controls (Dev Only)</div>
      <div>User ID: {userId}</div>
      <div>
        <button
          style={buttonStyle}
          onClick={() => setSubscription("active", "pro")}
        >
          Set Pro Active
        </button>
        <button
          style={buttonStyle}
          onClick={() => setSubscription("canceled", "pro")}
        >
          Set Canceled
        </button>
        <button
          style={buttonStyle}
          onClick={() => setSubscription("trialing", "pro")}
        >
          Set Trial
        </button>
      </div>
    </div>
  );
};

// Test cards for Stripe
export const STRIPE_TEST_CARDS = {
  success: "4242424242424242", // Always succeeds
  decline: "4000000000000002", // Always declined
  requireAuthentication: "4000002500003155", // Requires authentication
  insufficientFunds: "4000008260003178", // Insufficient funds
  expiredCard: "4000000000000069", // Expired card
};

// Output test card information to console
export const logTestCardInfo = () => {
  console.log("=== STRIPE TEST CARDS ===");
  console.log("Success: 4242424242424242");
  console.log("Decline: 4000000000000002");
  console.log("Require Authentication: 4000002500003155");
  console.log("Insufficient Funds: 4000008260003178");
  console.log("Expired Card: 4000000000000069");
  console.log("Use any future expiration date, any 3 digits for CVC");
};

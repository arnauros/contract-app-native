"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, FirestoreError } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import Cookies from "js-cookie";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { toast } from "react-hot-toast";
import {
  synchronizeSubscriptionCookie,
  forceUpdateSubscriptionCookie,
} from "@/lib/utils/cookieSynchronizer";

export default function SubscriptionDebug() {
  const { user, loading } = useAuth();
  const { synchronizeSubscription } = useSubscription();
  const [userClaims, setUserClaims] = useState<any>(null);
  const [firestoreData, setFirestoreData] = useState<any>(null);
  const [cookieData, setCookieData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !loading) {
      setIsLoading(false);
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, loading, refreshCount]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // 1. Get user claims
      const idTokenResult = await user.getIdTokenResult(true);
      setUserClaims(idTokenResult.claims);

      try {
        // 2. Get Firestore data
        const db = getFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setFirestoreData(userDoc.data());
        } else {
          setFirestoreData({ error: "User document not found" });
        }
      } catch (firestoreError: unknown) {
        console.error("Error fetching Firestore data:", firestoreError);

        // Handle permission denied errors gracefully
        if (
          firestoreError instanceof FirebaseError &&
          firestoreError.code === "permission-denied"
        ) {
          setFirestoreData({
            error:
              "Permission denied: You don't have access to this user's subscription data",
            errorCode: "permission-denied",
          });
        } else {
          setFirestoreData({
            error: "Failed to load Firestore data",
            errorDetails:
              firestoreError instanceof Error
                ? firestoreError.message
                : "Unknown error",
          });
        }
      }

      // 3. Get cookies
      const subscriptionCookie = Cookies.get("subscription_status");
      setCookieData({
        subscription_status: subscriptionCookie || "not set",
      });
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (user) {
      try {
        // Force token refresh
        await user.getIdToken(true);
        setRefreshCount((prev) => prev + 1);
      } catch (error) {
        console.error("Error refreshing token:", error);
        setError((error as Error).message);
      }
    }
  };

  if (!user && !loading) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold text-red-700">Not logged in</h2>
        <p>You need to be logged in to check subscription status.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Subscription Status Debug</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Refresh Data"}
          </button>

          <button
            onClick={async () => {
              try {
                await synchronizeSubscription();
              } catch (error) {
                console.error("Failed to synchronize subscription:", error);
                toast.error("Failed to synchronize subscription");
              }
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Fix Subscription
          </button>

          <button
            onClick={async () => {
              try {
                if (!user) {
                  toast.error("You need to be logged in to fix cookies");
                  return;
                }

                // Get the latest subscription status from auth claims
                const idTokenResult = await user.getIdTokenResult(true);
                const subscriptionStatus =
                  idTokenResult.claims?.subscriptionStatus;

                if (subscriptionStatus === "active") {
                  // If active in claims, force update the cookie to match
                  forceUpdateSubscriptionCookie("active");
                  toast.success("Cookie updated to 'active'");
                } else if (firestoreData?.subscription?.status === "active") {
                  // If active in Firestore but not in claims, force cookie and fix claims
                  forceUpdateSubscriptionCookie("active");
                  toast.success(
                    "Cookie updated to 'active' based on Firestore data"
                  );

                  // Recommend fixing claims too
                  toast.success(
                    "Please also click 'Fix Subscription' to update your auth claims",
                    {
                      duration: 5000,
                    }
                  );
                } else {
                  // Try to synchronize with claims first
                  synchronizeSubscriptionCookie(idTokenResult.claims);

                  // If we can't determine the status, let the user choose
                  if (!subscriptionStatus) {
                    const confirmForce = window.confirm(
                      "Could not determine subscription status from claims. Force set cookie to 'active'?"
                    );

                    if (confirmForce) {
                      forceUpdateSubscriptionCookie("active");
                      toast.success("Cookie force-updated to 'active'");
                    }
                  }
                }

                setRefreshCount((prev) => prev + 1);
              } catch (error) {
                console.error("Failed to fix cookie:", error);
                toast.error("Failed to fix cookie");
              }
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Fix Cookie
          </button>
        </div>
      </div>

      {/* Explanation notice */}
      <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
        <p className="font-medium">About this debug page</p>
        <p className="text-sm mt-1">
          This debug page is exempt from subscription protection so you can
          access it even after canceling your subscription. If you're seeing
          permission errors in other parts of the app, use the "Fix
          Subscription" button to synchronize your subscription status.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 text-center">
          <p>Loading subscription data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium">
              User Information
            </div>
            <div className="p-4">
              <p className="mb-1">
                <strong>User ID:</strong> {user?.uid}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
            </div>
          </div>

          {/* Auth Claims Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium">
              Firebase Auth Claims
            </div>
            <div className="p-4 overflow-auto max-h-60">
              <p className="mb-2 font-medium">
                Subscription Status:{" "}
                <span
                  className={
                    userClaims?.subscriptionStatus === "active"
                      ? "text-green-600"
                      : userClaims?.subscriptionStatus === "canceled"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }
                >
                  {userClaims?.subscriptionStatus || "not set"}
                </span>
              </p>
              <p className="mb-2 font-medium">
                Subscription Tier:{" "}
                <span
                  className={
                    userClaims?.subscriptionTier === "pro"
                      ? "text-green-600"
                      : "text-gray-600"
                  }
                >
                  {userClaims?.subscriptionTier || "not set"}
                </span>
              </p>
              <pre className="bg-gray-50 p-2 rounded text-xs mt-2">
                {JSON.stringify(userClaims, null, 2)}
              </pre>
            </div>
          </div>

          {/* Firestore Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium">
              Firestore Subscription Data
            </div>
            <div className="p-4 overflow-auto max-h-60">
              {firestoreData?.error ? (
                <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700 mb-3">
                  <p className="font-medium">{firestoreData.error}</p>
                  {firestoreData.errorDetails && (
                    <p className="text-xs mt-1">{firestoreData.errorDetails}</p>
                  )}
                  {firestoreData.errorCode === "permission-denied" && (
                    <p className="mt-2 text-sm">
                      This is normal if your subscription is canceled and you no
                      longer have access to premium features.
                    </p>
                  )}
                </div>
              ) : firestoreData?.subscription ? (
                <>
                  <p className="mb-2 font-medium">
                    Subscription Status:{" "}
                    <span
                      className={
                        firestoreData.subscription.status === "active"
                          ? "text-green-600"
                          : firestoreData.subscription.status === "canceled"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }
                    >
                      {firestoreData.subscription.status}
                    </span>
                  </p>
                  <p className="mb-2 font-medium">
                    Subscription Tier:{" "}
                    <span
                      className={
                        firestoreData.subscription.tier === "pro"
                          ? "text-green-600"
                          : "text-gray-600"
                      }
                    >
                      {firestoreData.subscription.tier}
                    </span>
                  </p>
                  <p className="mb-2 font-medium">
                    Cancel At Period End:{" "}
                    <span
                      className={
                        firestoreData.subscription.cancelAtPeriodEnd
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {firestoreData.subscription.cancelAtPeriodEnd
                        ? "Yes"
                        : "No"}
                    </span>
                  </p>
                  <p className="mb-2">
                    <strong>Current Period End:</strong>{" "}
                    {firestoreData.subscription.currentPeriodEnd
                      ? new Date(
                          firestoreData.subscription.currentPeriodEnd
                        ).toLocaleString()
                      : "not set"}
                  </p>
                </>
              ) : (
                <p>No subscription data found</p>
              )}
              <pre className="bg-gray-50 p-2 rounded text-xs mt-2">
                {JSON.stringify(
                  firestoreData?.subscription || firestoreData,
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          {/* Cookie Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium">Cookie Data</div>
            <div className="p-4">
              <p className="mb-2 font-medium">
                Subscription Status Cookie:{" "}
                <span
                  className={
                    cookieData?.subscription_status === "active"
                      ? "text-green-600"
                      : cookieData?.subscription_status === "canceled"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }
                >
                  {cookieData?.subscription_status}
                </span>
              </p>
              <pre className="bg-gray-50 p-2 rounded text-xs mt-2">
                {JSON.stringify(cookieData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

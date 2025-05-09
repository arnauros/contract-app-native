"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import {
  TestSubscriptionControls,
  logTestCardInfo,
  setUserSubscriptionStatus,
} from "@/lib/test-helpers";

export default function TestSubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gatedContent, setGatedContent] = useState<string | null>(null);

  // Log test card info on page load
  useEffect(() => {
    logTestCardInfo();
  }, []);

  // Fetch the current user's subscription data
  useEffect(() => {
    if (!user) return;

    const fetchSubscriptionData = async () => {
      try {
        setIsLoading(true);
        const db = await import("firebase/firestore").then((mod) => {
          const { getFirestore, doc, getDoc } = mod;
          return { getFirestore, doc, getDoc };
        });

        const firestore = db.getFirestore();
        const userDoc = await db.getDoc(db.doc(firestore, "users", user.uid));

        if (userDoc.exists()) {
          setSubscriptionData(userDoc.data().subscription || null);
        } else {
          setSubscriptionData(null);
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  // Function to directly update subscription status
  const quickSetSubscription = async (status: string) => {
    if (!user) return;
    await setUserSubscriptionStatus(user.uid, status);
    window.location.reload();
  };

  // Function to test accessing gated content
  const testGatedContent = async () => {
    try {
      setGatedContent("Loading protected content...");

      // Simulate API call to protected endpoint
      const response = await fetch("/api/protected-content", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGatedContent(data.message || JSON.stringify(data));
      } else {
        setGatedContent(`Error: ${response.status} - Access denied`);
      }
    } catch (error) {
      setGatedContent(
        `Error accessing protected content: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-6">You need to be logged in to access this page.</p>
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Subscription Test Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border p-4 rounded-lg">
            <h2 className="font-semibold text-lg mb-3">User Info</h2>
            <div>
              <p>
                <strong>User ID:</strong> {user.uid}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="font-medium mb-2">Subscription Status</h3>
              {isLoading ? (
                <p>Loading subscription data...</p>
              ) : (
                <div className="bg-gray-50 p-3 rounded">
                  <p>
                    <strong>Status:</strong>{" "}
                    {subscriptionData?.status || "No subscription"}
                  </p>
                  <p>
                    <strong>Tier:</strong> {subscriptionData?.tier || "free"}
                  </p>
                  {subscriptionData?.currentPeriodEnd && (
                    <p>
                      <strong>Renews:</strong>{" "}
                      {new Date(
                        subscriptionData.currentPeriodEnd
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border p-4 rounded-lg">
            <h2 className="font-semibold text-lg mb-3">Test Controls</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">
                  Quickly Set Subscription Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => quickSetSubscription("active")}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Set Active
                  </button>
                  <button
                    onClick={() => quickSetSubscription("canceled")}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Set Canceled
                  </button>
                  <button
                    onClick={() => quickSetSubscription("trialing")}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Set Trial
                  </button>
                  <button
                    onClick={() => quickSetSubscription("unpaid")}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Set Unpaid
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Test Protected Content</h3>
                <button
                  onClick={testGatedContent}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Try Access Protected Content
                </button>

                {gatedContent && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">Response:</p>
                    <p className="text-sm">{gatedContent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="font-semibold text-lg mb-3">Test Stripe Payment</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Stripe Test Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded shadow-sm">
                  <p className="text-green-600 font-medium">
                    Successful Payment
                  </p>
                  <p className="font-mono">4242 4242 4242 4242</p>
                </div>
                <div className="p-3 bg-white rounded shadow-sm">
                  <p className="text-red-600 font-medium">Declined Payment</p>
                  <p className="font-mono">4000 0000 0000 0002</p>
                </div>
                <div className="p-3 bg-white rounded shadow-sm">
                  <p className="text-blue-600 font-medium">3D Secure Auth</p>
                  <p className="font-mono">4000 0025 0000 3155</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use any future expiration date, any 3 digits for CVC, and any
                zip code.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Test Payment Flow</h3>
              <a
                href="/pricing"
                className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Go to Pricing Page
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Only show in development */}
      {process.env.NODE_ENV === "development" && user && (
        <TestSubscriptionControls userId={user.uid} />
      )}
    </div>
  );
}

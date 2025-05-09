"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getStripe } from "@/lib/stripe/config";

export default function TestAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);

        // Get user subscription data
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();

          if (userData?.subscription) {
            setSubscription(userData.subscription);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to fetch subscription data");
        }
      } else {
        setUser(null);
        setSubscription(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMonthlySubscription = async () => {
    if (!user) {
      setError("You must be logged in");
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);

      // Call your API to create a checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      await stripe.redirectToCheckout({ sessionId });
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      setError(err.message || "Failed to redirect to checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleYearlySubscription = async () => {
    if (!user) {
      setError("You must be logged in");
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);

      // Call your API to create a checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      await stripe.redirectToCheckout({ sessionId });
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      setError(err.message || "Failed to redirect to checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Test Admin Page</h1>
        <p className="mb-4">You need to be logged in to view this page</p>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">Test Admin Page</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Firebase Authentication</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">User ID:</span> {user.uid}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-medium">Email Verified:</span>{" "}
            {user.emailVerified ? "Yes" : "No"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stripe Subscription</h2>
        {subscription ? (
          <div className="space-y-2">
            <p>
              <span className="font-medium">Status:</span> {subscription.status}
            </p>
            <p>
              <span className="font-medium">Tier:</span> {subscription.tier}
            </p>
            <p>
              <span className="font-medium">Subscription ID:</span>{" "}
              {subscription.subscriptionId}
            </p>
            <p>
              <span className="font-medium">Expires:</span>{" "}
              {new Date(
                subscription.currentPeriodEnd * 1000
              ).toLocaleDateString()}
            </p>
            <p>
              <span className="font-medium">Auto-renew:</span>{" "}
              {subscription.cancelAtPeriodEnd ? "No" : "Yes"}
            </p>
          </div>
        ) : (
          <p>No active subscription found</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Test Stripe Checkout</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-4 mt-4">
          <button
            onClick={handleMonthlySubscription}
            disabled={checkoutLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {checkoutLoading ? "Loading..." : "Subscribe Monthly"}
          </button>
          <button
            onClick={handleYearlySubscription}
            disabled={checkoutLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {checkoutLoading ? "Loading..." : "Subscribe Yearly"}
          </button>
        </div>
      </div>
    </div>
  );
}

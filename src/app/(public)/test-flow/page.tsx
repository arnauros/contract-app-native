"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import Link from "next/link";
import toast from "react-hot-toast";

export default function TestFlowPage() {
  const { user, loading: authLoading, loggedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const { createCheckoutSession } = useSubscription();

  // Check for success query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutSuccess = urlParams.get("checkout_success");
    const checkoutCanceled = urlParams.get("checkout_canceled");

    if (checkoutSuccess === "true") {
      setCheckoutComplete(true);
      toast.success("Payment successful! You're now subscribed.");
    }

    if (checkoutCanceled === "true") {
      toast.error("Checkout was canceled.");
    }
  }, []);

  // Use the simpler auth loading pattern in useEffect
  useEffect(() => {
    // Do nothing while still loading
    if (authLoading) {
      console.log("Auth is still loading, waiting for confirmation...");
      return;
    }

    console.log("Auth state confirmed:", { loggedIn, userId: user?.uid });

    // Once loading is complete, we can trust the loggedIn value
    if (loggedIn && user) {
      // Fetch subscription status for logged in users
      const fetchSubscriptionStatus = async () => {
        try {
          const db = await import("firebase/firestore").then((mod) => {
            const { getFirestore, doc, getDoc } = mod;
            return { getFirestore, doc, getDoc };
          });

          const firestore = db.getFirestore();
          const userDoc = await db.getDoc(db.doc(firestore, "users", user.uid));

          console.log("Fetched subscription data for user:", user.uid);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setSubscriptionStatus(userData?.subscription?.status || "none");
          } else {
            setSubscriptionStatus("none");
          }
        } catch (error) {
          console.error("Error fetching subscription status:", error);
          setSubscriptionStatus("error");
        }
      };

      fetchSubscriptionStatus();
    }
  }, [user, authLoading, loggedIn]);

  const handleCheckout = async (plan: "starter" | "professional") => {
    setLoading(true);
    try {
      console.log("Current auth state:", { loggedIn, authLoading });

      // Wait for auth loading to complete before checking login state
      if (authLoading) {
        toast.error("Still verifying authentication – try again in a moment.");
        setLoading(false);
        return;
      }

      // Now we can trust the loggedIn state - cleaner check!
      if (!loggedIn || !user) {
        console.log("Auth confirmed: User not logged in, redirecting to login");
        toast.error("Please log in to subscribe");
        router.push(`/login?returnUrl=${encodeURIComponent("/test-flow")}`);
        return;
      }

      console.log(
        "Auth confirmed: User is logged in, proceeding with checkout",
        {
          uid: user?.uid,
        }
      );

      // Determine price ID based on selected plan
      const priceId =
        plan === "starter" ? STRIPE_PRICE_IDS.MONTHLY : STRIPE_PRICE_IDS.YEARLY;

      console.log(
        "Starting checkout with price ID:",
        priceId,
        "User:",
        user?.uid
      );

      // Direct API call approach
      console.log("Attempting direct API call");
      const loadingToast = toast.loading("Preparing checkout...");

      try {
        const response = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId,
            userId: user?.uid,
          }),
        });

        toast.dismiss(loadingToast);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error response:", errorData);
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const { sessionId, url } = await response.json();
        console.log("Got session ID:", sessionId);

        if (!url) {
          throw new Error("No checkout URL returned from server");
        }

        toast.success("Redirecting to Stripe checkout...");

        // Redirect directly to the checkout URL
        window.location.href = url;
      } catch (apiError) {
        console.error("Checkout API error:", apiError);
        toast.error("Checkout failed. Please try again.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderAuthStatus = () => {
    if (authLoading) {
      return <p className="mb-4">Checking authentication status...</p>;
    }

    if (user) {
      return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-700">
            ✅ Logged in as {user.email}
          </p>
          <p className="text-sm text-green-600">User ID: {user.uid}</p>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="font-medium text-yellow-700">⚠️ Not logged in</p>
        <p className="text-sm text-yellow-600">
          <Link href="/login" className="text-blue-600 underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="text-blue-600 underline">
            Sign up
          </Link>{" "}
          to continue
        </p>
      </div>
    );
  };

  const renderSubscriptionStatus = () => {
    if (!user) return null;

    if (subscriptionStatus === "active") {
      return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-700">✅ Active subscription</p>
          <p className="text-sm text-blue-600">
            You have an active subscription plan
          </p>
        </div>
      );
    }

    if (checkoutComplete) {
      return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-700">✅ Payment successful!</p>
          <p className="text-sm text-blue-600">
            Your subscription should be active now
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="font-medium text-gray-700">No active subscription</p>
        <p className="text-sm text-gray-600">
          Choose a plan below to subscribe
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">
        Subscription Test Flow
      </h1>

      {renderAuthStatus()}
      {renderSubscriptionStatus()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Starter Plan</h3>
          <p className="text-3xl font-bold mb-2">
            $12<span className="text-sm text-gray-500">/month</span>
          </p>
          <ul className="mb-6 space-y-2">
            <li className="flex items-center text-gray-600">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              2 projects
            </li>
            <li className="flex items-center text-gray-600">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Basic analytics
            </li>
          </ul>
          <button
            onClick={() => handleCheckout("starter")}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Subscribe Now"}
          </button>
        </div>

        <div className="p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Professional Plan</h3>
          <p className="text-3xl font-bold mb-2">
            $18<span className="text-sm text-gray-500">/month</span>
          </p>
          <ul className="mb-6 space-y-2">
            <li className="flex items-center text-gray-600">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              10 projects
            </li>
            <li className="flex items-center text-gray-600">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Advanced analytics
            </li>
            <li className="flex items-center text-gray-600">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Priority support
            </li>
          </ul>
          <button
            onClick={() => handleCheckout("professional")}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Subscribe Now"}
          </button>
        </div>
      </div>

      <div className="mt-12 space-y-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Testing Instructions
        </h2>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Complete Flow Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Log out (if you're logged in)</li>
            <li>Try clicking Subscribe button (it should prompt login)</li>
            <li>Log in with your account</li>
            <li>Return to this page (/test-flow)</li>
            <li>Click Subscribe on either plan</li>
            <li>Complete the Stripe checkout process</li>
            <li>You should be redirected back here with a success message</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

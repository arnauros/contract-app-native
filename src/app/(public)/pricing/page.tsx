"use client";

import { useState, useEffect } from "react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import { useDomain } from "@/lib/hooks/useDomain";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

export default function PricingPage() {
  const { loading, error, createCheckoutSession } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const { isAppLocal } = useDomain();
  const router = useRouter();
  const { user, loading: authLoading, loggedIn } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // Add logging for debugging
  useEffect(() => {
    console.log("Pricing page - auth state:", {
      loggedIn,
      authLoading,
      userId: user?.uid || "not logged in",
    });
  }, [user, authLoading, loggedIn]);

  // Check for subscription intent after login
  useEffect(() => {
    // Only run when user is logged in and not in loading state
    if (loggedIn && !authLoading && !redirecting && user) {
      const storedIntent = localStorage.getItem("subscription_intent");
      if (
        storedIntent &&
        (storedIntent === "monthly" || storedIntent === "yearly")
      ) {
        console.log("Found stored subscription intent:", storedIntent);
        // Clear intent before processing
        localStorage.removeItem("subscription_intent");
        // Process the subscription
        handleSubscribe(storedIntent);
      }
    }
  }, [loggedIn, authLoading, redirecting, user]);

  const handleSubscribe = async (interval: "monthly" | "yearly") => {
    console.log("Button clicked:", interval);

    try {
      // Wait for auth state to stabilize
      if (authLoading) {
        console.log("Auth is still loading, showing loading toast");
        toast.loading("Preparing your checkout...");
        // Wait longer to ensure Firebase auth is fully initialized (up to 2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));
        toast.dismiss();
      }

      // After waiting, check if the user exists in Firebase Auth context
      // This works even if loggedIn hasn't been updated yet
      if (user) {
        console.log("User found in auth context:", user.uid);

        // Store the intent in case the checkout flow gets interrupted
        localStorage.setItem("last_checkout_attempt", interval);

        // Set redirecting state to show loading UI
        setRedirecting(true);

        // Get the appropriate price ID based on interval
        const priceId =
          interval === "monthly"
            ? STRIPE_PRICE_IDS.MONTHLY
            : STRIPE_PRICE_IDS.YEARLY;

        console.log("Using price ID:", priceId);

        // Directly call Stripe checkout
        try {
          // The checkout process uses Firebase Firestore and the Stripe extension
          // The actual redirect will happen in the createCheckoutSession function
          await createCheckoutSession(priceId);
          // Note: No need to reset redirecting state as the user will be redirected to Stripe
        } catch (error) {
          console.error("Failed to start checkout:", error);
          toast.error("Checkout failed. Please try again.");
          setRedirecting(false);
        }
        return;
      }

      // If user is still not available after waiting
      console.log("No user found after waiting, redirecting to login");
      toast.error("Please log in to subscribe");
      // Store the intent to subscribe to this plan after login
      localStorage.setItem("subscription_intent", interval);
      router.push(`/login?returnUrl=${encodeURIComponent("/pricing")}`);
    } catch (e) {
      console.error("Error in handleSubscribe:", e);
      toast.error("Something went wrong. Please try again.");
      setRedirecting(false);
    }
  };

  return (
    <div className="bg-teal-600 min-h-screen flex flex-col items-center justify-center py-12">
      <div className="mb-10 text-white">
        <div className="flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2"
          >
            <path
              d="M16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z"
              fill="white"
              fillOpacity="0.8"
            />
            <path
              d="M21.5 14.5C20.1193 14.5 19 13.3807 19 12C19 10.6193 20.1193 9.5 21.5 9.5C22.8807 9.5 24 10.6193 24 12C24 13.3807 22.8807 14.5 21.5 14.5Z"
              fill="#ff4d4d"
            />
            <path
              d="M11.5 19.5C10.1193 19.5 9 18.3807 9 17C9 15.6193 10.1193 14.5 11.5 14.5C12.8807 14.5 14 15.6193 14 17C14 18.3807 12.8807 19.5 11.5 19.5Z"
              fill="#ff4d4d"
            />
            <path
              d="M16.5 24.5C15.1193 24.5 14 23.3807 14 22C14 20.6193 15.1193 19.5 16.5 19.5C17.8807 19.5 19 20.6193 19 22C19 23.3807 17.8807 24.5 16.5 24.5Z"
              fill="#ff4d4d"
            />
          </svg>
          <h1 className="text-2xl font-semibold">togethere</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">
            Choose a collaboration plan
          </h2>
        </div>

        <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200">
            {/* Starter Plan */}
            <div className="bg-white p-8 flex flex-col">
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  <Image
                    src="/placeholder-logo.png"
                    alt="Starter plan"
                    width={96}
                    height={96}
                    className="object-contain"
                  />
                </div>
              </div>
              <h3 className="text-xl font-medium text-center text-gray-700 mb-2">
                Starter
              </h3>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold">$12</p>
                <p className="text-gray-500">per month</p>
              </div>
              <ul className="mb-8 space-y-4 flex-grow">
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">2 projects</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">Up to 1,000 apps</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">Basic analytics</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">E-mail support</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={redirecting}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-full transition-colors disabled:opacity-70"
              >
                {redirecting ? "Redirecting..." : "Select"}
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-white p-8 flex flex-col">
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  <Image
                    src="/placeholder-logo.png"
                    alt="Professional plan"
                    width={96}
                    height={96}
                    className="object-contain"
                  />
                </div>
              </div>
              <h3 className="text-xl font-medium text-center text-gray-700 mb-2">
                Professional
              </h3>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold">$18</p>
                <p className="text-gray-500">per month</p>
              </div>
              <ul className="mb-8 space-y-4 flex-grow">
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">10 projects</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">Up to 10,000 apps</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">
                    24-hour chat support
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-5 flex-shrink-0 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-700">Channel management</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={redirecting}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-full transition-colors disabled:opacity-70"
              >
                {redirecting ? "Redirecting..." : "Select"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-center">
            <p className="text-red-100 bg-red-500 bg-opacity-20 p-3 rounded-lg">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

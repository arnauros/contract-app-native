"use client";

import { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import { isLocalDevelopment, env } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { CheckIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";
import { SolarLogo } from "../../../../template-solar-main/public/SolarLogo";

// Features included in each plan
const includedFeatures = [
  "Private forum access",
  "Member resources",
  "Entry to annual conference",
  "Official member t-shirt",
];

// Global lock to prevent multiple subscription attempts
let GLOBAL_CHECKOUT_LOCK = false;

// Track checkout attempts with a timestamp
const CHECKOUT_ATTEMPT_HISTORY: number[] = [];
const MAX_CHECKOUT_ATTEMPTS = 3; // Maximum attempts in a 10-minute window
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

// Track checkout IDs to prevent duplicate checkouts
const CHECKOUT_IDS = new Set<string>();

// Extend Window interface to add our custom properties
declare global {
  interface Window {
    CHECKOUT_CLEARED_ON_MOUNT?: boolean;
  }
}

export default function PricingPage() {
  const { loading, error, createCheckoutSession } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, loggedIn } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null
  );
  // Use ref to track last click time for debounce
  const lastClickTime = useRef(0);
  // Ref to track if this component has initiated a checkout
  const checkoutInitiatedRef = useRef(false);
  // Flag to track if we've already handled URL params
  const handledParamsRef = useRef(false);

  const pricingDetails = {
    monthly: {
      price: "19",
      period: "month",
    },
    yearly: {
      price: "199",
      period: "year",
      discount: "Save $29",
    },
  };

  // Function to check if too many checkout attempts have been made
  const tooManyCheckoutAttempts = () => {
    const now = Date.now();
    // Filter out attempts older than the checkout window
    const recentAttempts = CHECKOUT_ATTEMPT_HISTORY.filter(
      (timestamp) => now - timestamp < CHECKOUT_WINDOW_MS
    );
    // Update the history array
    CHECKOUT_ATTEMPT_HISTORY.length = 0;
    CHECKOUT_ATTEMPT_HISTORY.push(...recentAttempts);

    // Check if we've exceeded max attempts
    return CHECKOUT_ATTEMPT_HISTORY.length >= MAX_CHECKOUT_ATTEMPTS;
  };

  // Function to thoroughly clear all checkout flags
  const clearAllCheckoutFlags = () => {
    console.log("Clearing all checkout flags");

    // Clear all localStorage flags
    const checkoutFlags = [
      "checkout_in_progress",
      "subscription_intent",
      "last_checkout_attempt",
      "checkout_start_time",
      "checkout_session_id",
      "checkout_price_id",
    ];

    checkoutFlags.forEach((flag) => {
      if (localStorage.getItem(flag)) {
        localStorage.removeItem(flag);
      }
    });

    // Reset the locks
    GLOBAL_CHECKOUT_LOCK = false;
    checkoutInitiatedRef.current = false;

    // Clear global window flag if it exists
    if (typeof window !== "undefined" && window.GLOBAL_CHECKOUT_LOCK) {
      window.GLOBAL_CHECKOUT_LOCK = false;
    }
  };

  // Track when this component mounts
  const componentMountedAt = useRef(Date.now());

  // Clear checkout flags on component mount
  useEffect(() => {
    // Only clear on fresh loads, not just React re-renders
    if (typeof window !== "undefined" && !window.CHECKOUT_CLEARED_ON_MOUNT) {
      console.log("Clearing checkout flags on PricingPage mount");
      clearAllCheckoutFlags();
      window.CHECKOUT_CLEARED_ON_MOUNT = true;
    }

    return () => {
      // Only clear when component truly unmounts
      if (
        typeof window !== "undefined" &&
        Date.now() - componentMountedAt.current > 1000
      ) {
        console.log("Clearing checkout flags on PricingPage unmount");
        clearAllCheckoutFlags();
      }
    };
  }, []);

  // Handle URL parameters for checkout cancellation or errors
  useEffect(() => {
    // Make sure we only handle this once
    if (handledParamsRef.current || !searchParams) return;
    handledParamsRef.current = true;

    const checkoutCanceled = searchParams.get("checkout_canceled");
    const checkoutError = searchParams.get("checkout_error");
    const checkoutId = searchParams.get("checkout_id");

    if (checkoutCanceled === "true") {
      console.log("Checkout was canceled, clearing flags");
      toast.error("Checkout was canceled");
      clearAllCheckoutFlags();

      // Remove the checkout ID from tracking set
      if (checkoutId && CHECKOUT_IDS.has(checkoutId)) {
        CHECKOUT_IDS.delete(checkoutId);
      }

      // Clear the URL parameters
      router.replace("/pricing");
    }

    if (checkoutError) {
      console.log("Checkout error:", checkoutError);
      toast.error(`Checkout error: ${checkoutError}`);
      clearAllCheckoutFlags();
      router.replace("/pricing");
    }
  }, [searchParams, router]);

  // Add logging for debugging
  useEffect(() => {
    console.log("Pricing page - auth state:", {
      loggedIn,
      authLoading,
      userId: user?.uid || "not logged in",
    });

    // Log the price IDs for reference
    console.log("Using Stripe Price IDs:", {
      monthly: STRIPE_PRICE_IDS.MONTHLY,
      yearly: STRIPE_PRICE_IDS.YEARLY,
      fromENV: {
        monthly: process.env.STRIPE_MONTHLY_PRICE_ID || "not set",
        yearly: process.env.STRIPE_YEARLY_PRICE_ID || "not set",
      },
    });
  }, [user, authLoading, loggedIn]);

  // Handler for Firebase errors
  useEffect(() => {
    // Listen for errors in the console and capture subscription errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);

      // Check if this is a Firebase permission error
      const errorStr = args.join(" ");
      if (
        errorStr.includes(
          "FirebaseError: Missing or insufficient permissions"
        ) ||
        errorStr.includes("Error checking subscription")
      ) {
        setSubscriptionError(
          "There was an issue checking your subscription status. Please try again later."
        );
      }
    };

    return () => {
      // Clean up
      console.error = originalConsoleError;
    };
  }, []);

  // Check for subscription intent after login - add check to prevent loops
  useEffect(() => {
    // Only run when user is logged in and not in loading state
    if (loggedIn && !authLoading && !redirecting && user) {
      const storedIntent = localStorage.getItem("subscription_intent");

      // Only proceed if we have a valid intent and we're not already in a checkout flow
      // Use both localStorage and memory lock for protection
      if (
        storedIntent &&
        (storedIntent === "monthly" || storedIntent === "yearly") &&
        !localStorage.getItem("checkout_in_progress") &&
        !GLOBAL_CHECKOUT_LOCK &&
        !checkoutInitiatedRef.current &&
        !tooManyCheckoutAttempts()
      ) {
        console.log("Found stored subscription intent:", storedIntent);
        // Clear intent before processing
        localStorage.removeItem("subscription_intent");
        // Process the subscription
        handleSubscribe(storedIntent as "monthly" | "yearly");
      }
    }
  }, [loggedIn, authLoading, redirecting, user]);

  const generateCheckoutId = (userId: string, priceId: string): string => {
    return `${userId}_${priceId}_${Date.now()}`;
  };

  const handleSubscribe = async (interval: "monthly" | "yearly") => {
    // Add simple debounce with ref
    const now = Date.now();
    if (now - lastClickTime.current < 2000) {
      // 2 second cooldown between clicks
      console.log("Click debounced, ignoring");
      return;
    }

    // Track too many checkout attempts
    if (tooManyCheckoutAttempts()) {
      console.log("Too many checkout attempts in a short period, blocking");
      toast.error("Too many checkout attempts. Please try again later.");
      return;
    }

    lastClickTime.current = now;
    // Record this attempt
    CHECKOUT_ATTEMPT_HISTORY.push(now);

    console.log("Button clicked:", interval);

    try {
      // Prevent multiple checkout attempts - use both localStorage and memory
      if (
        localStorage.getItem("checkout_in_progress") ||
        GLOBAL_CHECKOUT_LOCK ||
        checkoutInitiatedRef.current
      ) {
        console.log("Checkout already in progress, aborting");
        toast.error(
          "A checkout is already in progress. Please wait or refresh the page."
        );
        return;
      }

      // Set checkout in progress flags
      localStorage.setItem("checkout_in_progress", "true");
      GLOBAL_CHECKOUT_LOCK = true;
      checkoutInitiatedRef.current = true;

      // Wait for auth state to stabilize
      if (authLoading) {
        console.log("Auth is still loading, showing loading toast");
        toast.loading("Preparing your checkout...");
        // Wait longer to ensure Firebase auth is fully initialized (up to 2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));
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

        // Generate a unique checkout ID
        const checkoutId = generateCheckoutId(user.uid, priceId);

        // Check if this exact checkout has been attempted recently
        if (CHECKOUT_IDS.has(checkoutId)) {
          console.log("Duplicate checkout attempt detected", checkoutId);
          toast.error(
            "Please wait, your previous checkout is still processing"
          );
          setRedirecting(false);
          return;
        }

        // Add to tracking set
        CHECKOUT_IDS.add(checkoutId);

        // Set a timeout to clear this ID after 5 minutes
        setTimeout(() => {
          CHECKOUT_IDS.delete(checkoutId);
        }, 5 * 60 * 1000);

        console.log("Using price ID:", priceId);

        // Directly call Stripe checkout
        try {
          // The checkout process uses Firebase Firestore and the Stripe extension
          // The actual redirect will happen in the createCheckoutSession function
          await createCheckoutSession(priceId);
          // Note: No need to reset redirecting state as the user will be redirected to Stripe
        } catch (error) {
          console.error("Failed to start checkout:", error);
          toast.error("Failed to start checkout. Please try again later.");
          setRedirecting(false);
          clearAllCheckoutFlags();
        }
      } else {
        // No user, store intent for later and redirect to login
        console.log("No user found, storing intent and redirecting to login");
        localStorage.setItem("subscription_intent", interval);

        // Reset flags since we're not proceeding with checkout yet
        clearAllCheckoutFlags();

        router.push("/login");
      }
    } catch (error) {
      console.error("Error during subscribe flow:", error);
      toast.error("An unexpected error occurred. Please try again later.");
      setRedirecting(false);
      clearAllCheckoutFlags();
    }
  };

  return (
    <div className="bg-white py-24 sm:py-32">
      {/* Display a banner for subscription errors */}
      {subscriptionError && (
        <div className="fixed top-0 left-0 right-0 bg-red-100 text-red-800 py-2 px-4 text-center z-50">
          <button
            onClick={() => setSubscriptionError(null)}
            className="float-right text-red-600 hover:text-red-800"
          >
            ×
          </button>
          {subscriptionError}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl sm:text-center">
          <h2 className="text-pretty text-5xl font-semibold tracking-tight text-gray-900 sm:text-balance sm:text-6xl">
            Simple no-tricks pricing
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
            Distinctio et nulla eum soluta et neque labore quibusdam. Saepe et
            quasi iusto modi velit ut non voluptas in. Explicabo id ut laborum.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mx-auto mt-12 flex max-w-xs justify-center">
          <div className="relative flex w-full rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              className={cn(
                "w-1/2 rounded-md py-2 text-sm font-medium transition-all",
                billingPeriod === "monthly"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                "w-1/2 rounded-md py-2 text-sm font-medium transition-all",
                billingPeriod === "yearly"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              onClick={() => setBillingPeriod("yearly")}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
          <div className="p-8 sm:p-10 lg:flex-auto">
            <h3 className="text-3xl font-semibold tracking-tight text-gray-900">
              Premium Plan
            </h3>
            <p className="mt-6 text-base/7 text-gray-600">
              Lorem ipsum dolor sit amet consect etur adipisicing elit. Itaque
              amet indis perferendis blanditiis repellendus etur quidem
              assumenda.
            </p>
            <div className="mt-10 flex items-center gap-x-4">
              <h4 className="flex-none text-sm/6 font-semibold text-orange-600">
                What's included
              </h4>
              <div className="h-px flex-auto bg-gray-100" />
            </div>
            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 text-sm/6 text-gray-600 sm:grid-cols-2 sm:gap-6"
            >
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon
                    aria-hidden="true"
                    className="h-6 w-5 flex-none text-orange-600"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:shrink-0">
            <div className="rounded-2xl bg-gray-50 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
              <div className="mx-auto max-w-xs px-8">
                <p className="text-base font-semibold text-gray-600">
                  {billingPeriod === "yearly"
                    ? "Pay yearly, save more"
                    : "Pay monthly, cancel anytime"}
                </p>
                <p className="mt-6 flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-semibold tracking-tight text-gray-900">
                    ${pricingDetails[billingPeriod].price}
                  </span>
                  <span className="text-sm/6 font-semibold tracking-wide text-gray-600">
                    USD/{pricingDetails[billingPeriod].period}
                  </span>
                </p>
                {billingPeriod === "yearly" && (
                  <p className="mt-2 text-sm font-medium text-orange-600">
                    {pricingDetails.yearly.discount}
                  </p>
                )}
                <button
                  onClick={() => handleSubscribe(billingPeriod)}
                  disabled={redirecting}
                  className="mt-10 block w-full rounded-md bg-orange-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-70"
                >
                  {redirecting ? "Redirecting..." : "Get access"}
                </button>
                <p className="mt-6 text-xs/5 text-gray-600">
                  Invoices and receipts available for easy company reimbursement
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Display general subscription errors */}
        {error && (
          <div className="mt-8 mx-auto max-w-lg">
            <p className="text-red-600 bg-red-50 p-3 rounded-lg text-center">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

// Features included in each plan
const includedFeatures = [
  "Private forum access",
  "Member resources",
  "Entry to annual conference",
  "Official member t-shirt",
];

// Track checkout attempts with a timestamp
const CHECKOUT_ATTEMPT_HISTORY: number[] = [];
const MAX_CHECKOUT_ATTEMPTS = 3; // Maximum attempts in a 10-minute window
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

// Track checkout IDs to prevent duplicate checkouts
const CHECKOUT_IDS = new Set<string>();

// Single global lock for any checkout
let GLOBAL_CHECKOUT_LOCK = false;

// Extend Window interface to add our custom properties
declare global {
  interface Window {
    CHECKOUT_CLEARED_ON_MOUNT?: boolean;
    __PRICING_PAGE_LOGGED?: boolean;
    __PRICING_PAGE_RENDERED?: boolean;
    __PRICING_RENDER_TOKEN?: string;
    GLOBAL_CHECKOUT_LOCK?: boolean;
    CHECKOUT_TIMESTAMP?: number;
    __SUBSCRIBE_REQUEST_IN_PROGRESS?: boolean;
  }
}

// Simple inline SolarLogo component to avoid cross-project imports
const SolarLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 123 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M65.888 16.936C65.824 16.616 65.7067 16.2747 65.536 15.912C65.3867 15.528 65.152 15.176 64.832 14.856C64.512 14.536 64.096 14.2693 63.584 14.056C63.0933 13.8427 62.4853 13.736 61.76 13.736C61.2267 13.736 60.736 13.8213 60.288 13.992C59.8613 14.1413 59.488 14.3547 59.168 14.632C58.8693 14.888 58.6347 15.1867 58.464 15.528C58.2933 15.8693 58.208 16.232 58.208 16.616C58.208 17.2347 58.4107 17.7787 58.816 18.248C59.2213 18.696 59.84 19.0053 60.672 19.176L63.84 19.784C64.864 19.976 65.7707 20.2853 66.56 20.712C67.3493 21.1387 68.0107 21.6507 68.544 22.248C69.0773 22.824 69.4827 23.4747 69.76 24.2C70.0373 24.9253 70.176 25.6827 70.176 26.472C70.176 27.3467 69.9947 28.2107 69.632 29.064C69.2693 29.896 68.736 30.6427 68.032 31.304C67.3493 31.944 66.496 32.4667 65.472 32.872C64.4693 33.2773 63.3067 33.48 61.984 33.48C60.4693 33.48 59.168 33.2667 58.08 32.84C56.992 32.392 56.0747 31.8267 55.328 31.144C54.6027 30.4613 54.048 29.704 53.664 28.872C53.28 28.0187 53.0453 27.1867 52.96 26.376L57.056 25.288C57.0987 25.8427 57.2267 26.376 57.44 26.888C57.6747 27.4 57.9947 27.8587 58.4 28.264C58.8053 28.648 59.3067 28.9573 59.904 29.192C60.5013 29.4267 61.2053 29.544 62.016 29.544C63.2107 29.544 64.1173 29.288 64.736 28.776C65.376 28.2427 65.696 27.5707 65.696 26.76C65.696 26.0987 65.4613 25.5333 64.992 25.064C64.5227 24.5733 63.84 24.2427 62.944 24.072L59.776 23.432C57.9627 23.0693 56.512 22.3333 55.424 21.224C54.3573 20.0933 53.824 18.664 53.824 16.936C53.824 15.9333 54.0267 15.0053 54.432 14.152C54.8587 13.2773 55.4347 12.52 56.16 11.88C56.8853 11.24 57.728 10.7387 58.688 10.376C59.648 10.0133 60.6613 9.832 61.728 9.832C63.0933 9.832 64.256 10.024 65.216 10.408C66.1973 10.7707 67.008 11.24 67.648 11.816C68.288 12.392 68.7787 13.032 69.12 13.736C69.4827 14.4187 69.728 15.08 69.856 15.72L65.888 16.936Z"
      fill="currentColor"
    />
  </svg>
);

export default function PricingPage() {
  // Early check to prevent duplicate rendering
  const renderToken = useRef(Math.random().toString(36).substring(2, 15));
  const [shouldRender, setShouldRender] = useState(true);

  // Check for duplicate rendering on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set a unique token for this render instance
    if (!window.__PRICING_PAGE_RENDERED) {
      window.__PRICING_PAGE_RENDERED = true;
      // Store the render token
      window.__PRICING_RENDER_TOKEN = renderToken.current;

      // Clear all checkout locks on a fresh render/page load
      clearAllCheckoutFlags();
      console.log("Fresh pricing page load - clearing all checkout flags");
    } else if (window.__PRICING_RENDER_TOKEN !== renderToken.current) {
      // If there's already a render with a different token, this is a duplicate
      console.warn("Duplicate PricingPage instance detected - not rendering");
      setShouldRender(false);
    }

    return () => {
      // Only remove the render flag if this is the original instance
      if (window.__PRICING_RENDER_TOKEN === renderToken.current) {
        console.log("Original pricing page instance unmounting");
        window.__PRICING_PAGE_RENDERED = false;
        delete window.__PRICING_RENDER_TOKEN;
      }
    };
  }, []);

  // If this is a duplicate instance, don't render
  if (!shouldRender) {
    return null;
  }

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

    if (typeof window !== "undefined") {
      checkoutFlags.forEach((flag) => {
        if (localStorage.getItem(flag)) {
          localStorage.removeItem(flag);
        }
      });

      // Reset the global locks
      window.GLOBAL_CHECKOUT_LOCK = false;
      GLOBAL_CHECKOUT_LOCK = false;
      checkoutInitiatedRef.current = false;

      // Set timestamp of last clear
      window.CHECKOUT_TIMESTAMP = Date.now();
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
        window.CHECKOUT_CLEARED_ON_MOUNT = false;
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
    // Add check for promo code in URL
    const promoCode = searchParams.get("promo");

    // Store promo code in state if present
    if (promoCode) {
      localStorage.setItem("promo_code", promoCode);
    }

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
    // Skip if auth is still loading or already logged
    if (
      authLoading ||
      typeof window === "undefined" ||
      window.__PRICING_PAGE_LOGGED
    )
      return;

    window.__PRICING_PAGE_LOGGED = true;

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

    // Clean up on unmount
    return () => {
      window.__PRICING_PAGE_LOGGED = false;
    };
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

  // Optimized function to prevent multiple checkout attempts
  const handleSubscribe = async (interval: "monthly" | "yearly") => {
    // Add simple debounce with ref
    const now = Date.now();
    if (now - lastClickTime.current < 2000) {
      // 2 second cooldown between clicks
      console.log("Click debounced, ignoring");
      return;
    }

    // Check if we already have a subscription request in progress
    if (
      typeof window !== "undefined" &&
      window.__SUBSCRIBE_REQUEST_IN_PROGRESS
    ) {
      console.log(
        "Subscribe request already in progress, ignoring duplicate click"
      );
      toast.error("Please wait, your request is being processed");
      return;
    }

    // Set flag to prevent multiple calls
    if (typeof window !== "undefined") {
      window.__SUBSCRIBE_REQUEST_IN_PROGRESS = true;
    }

    try {
      console.log("Button clicked:", interval);

      // Track too many checkout attempts
      if (tooManyCheckoutAttempts()) {
        console.log("Too many checkout attempts in a short period, blocking");
        toast.error("Too many checkout attempts. Please try again later.");
        return;
      }

      lastClickTime.current = now;
      // Record this attempt
      CHECKOUT_ATTEMPT_HISTORY.push(now);

      // Check for existing locks before proceeding
      if (typeof window !== "undefined") {
        // If browser-level lock is set, prevent duplicate checkout
        if (window.GLOBAL_CHECKOUT_LOCK) {
          console.log("Global checkout lock is set, aborting");
          toast.error(
            "A checkout is already in progress. Please wait or refresh the page."
          );
          return;
        }

        // Set checkout in progress on window and memory
        window.GLOBAL_CHECKOUT_LOCK = true;
        GLOBAL_CHECKOUT_LOCK = true;
      }

      // Make sure localStorage is clear
      clearAllCheckoutFlags();

      // Prevent multiple checkout attempts - check local storage as backup
      if (localStorage.getItem("checkout_in_progress")) {
        console.log("Checkout already in progress (localStorage), aborting");
        toast.error(
          "A checkout is already in progress. Please wait or refresh the page."
        );
        clearAllCheckoutFlags();
        return;
      }

      // Set checkout in progress flags
      localStorage.setItem("checkout_in_progress", "true");
      checkoutInitiatedRef.current = true;

      // Wait for auth state to stabilize
      if (authLoading) {
        console.log("Auth is still loading, showing loading toast");
        toast.loading("Preparing your checkout...");
        // Wait longer to ensure Firebase auth is fully initialized (up to 2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // After waiting, check if the user exists
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

        // Generate a unique checkout ID
        const checkoutId = generateCheckoutId(user.uid, priceId);

        // Check for stored promo code
        const promoCode = localStorage.getItem("promo_code");

        try {
          // Show processing feedback
          const loadingToast = toast.loading("Preparing your checkout...");

          // Call the subscription service to create checkout
          const success = await createCheckoutSession(
            priceId,
            promoCode || undefined
          );

          // Dismiss the loading toast
          toast.dismiss(loadingToast);

          // If createCheckoutSession returns false, there was an error
          if (success === false) {
            console.warn("Checkout creation returned false");
            clearAllCheckoutFlags();
            setRedirecting(false);
            setSubscriptionError("Checkout creation failed. Please try again.");
            return;
          }

          // Success is truthy but no redirect happened - we should still clear flags
          // This is a fallback for very rare cases
          setTimeout(() => {
            // If we're still on the page after 5 seconds, something went wrong
            if (
              typeof window !== "undefined" &&
              window.location.pathname.includes("/pricing")
            ) {
              console.log("Expected redirect didn't happen - clearing flags");
              clearAllCheckoutFlags();
              // Clear promo code from storage
              localStorage.removeItem("promo_code");

              // Show a generic error message if no redirect happened but no error was thrown
              setSubscriptionError(
                "Checkout session creation failed. Please try again later."
              );
              setRedirecting(false);
            }
          }, 5000);
        } catch (error: any) {
          console.error("Failed to start checkout:", error);

          // Display a more user-friendly error message based on the error
          let errorMessage =
            "Failed to start checkout. Please try again later.";

          // Handle specific error types
          if (error.message && typeof error.message === "string") {
            // Strip out any sensitive information before displaying
            const sanitizedError = error.message
              .replace(/sk_[a-zA-Z0-9_]+/g, "[REDACTED]") // Strip API keys
              .replace(
                /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
                "[EMAIL REDACTED]"
              ); // Strip emails

            // Check for common error patterns
            if (
              sanitizedError.includes("price_id") ||
              sanitizedError.includes("Price")
            ) {
              errorMessage =
                "Invalid pricing configuration. Please contact support.";
            } else if (
              sanitizedError.includes("customer") ||
              sanitizedError.includes("Customer")
            ) {
              errorMessage =
                "Customer account issue. Please try again or contact support.";
            } else if (sanitizedError.includes("API")) {
              errorMessage =
                "Service connection issue. Please try again later.";
            } else {
              // Use the sanitized error message if it seems safe
              errorMessage = sanitizedError;
            }
          }

          // Use the subscription error state for displaying in the UI
          setSubscriptionError(errorMessage);
          toast.error(errorMessage);

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
    } finally {
      // Always clear the in progress flag when done
      if (typeof window !== "undefined") {
        window.__SUBSCRIBE_REQUEST_IN_PROGRESS = false;
      }
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

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStripe } from "@/lib/stripe/config";
import toast from "react-hot-toast";
import {
  collection,
  getFirestore,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { app, db } from "@/lib/firebase/firebase";
import { isAdmin } from "@/lib/firebase/authUtils";
import { errorHandler, ErrorType } from "@/lib/utils";

export type SubscriptionStatus = {
  isActive: boolean;
  subscriptions: any[];
  loading: boolean;
  error: string | null;
};

// Create a global lock mechanism for checkout to prevent multiple calls
// This will persist across renders and hook instances
let CHECKOUT_IN_PROGRESS = false;
const ACTIVE_CHECKOUT_IDS = new Set<string>();

// Extend Window interface for our global variables
declare global {
  interface Window {
    GLOBAL_CHECKOUT_LOCK?: boolean;
  }
}

// Centralized subscription check
export function useSubscription() {
  const { user, loading: authLoading, isAdmin: isAdminUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>({
      isActive: false,
      subscriptions: [],
      loading: true,
      error: null,
    });

  // Track checkout attempts and last attempt time
  const lastCheckoutAttempt = useRef<number>(0);
  const checkoutRequestCount = useRef<number>(0);

  // Abort controller for checkout requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to check for timeout and clear stale checkout flags
  const clearStaleCheckoutFlags = () => {
    const checkoutStartTime = localStorage.getItem("checkout_start_time");

    if (checkoutStartTime) {
      const startTime = parseInt(checkoutStartTime, 10);
      const currentTime = Date.now();

      // If checkout was started more than 5 minutes ago, it's probably stuck
      if (currentTime - startTime > 5 * 60 * 1000) {
        console.log("Clearing stale checkout flags (older than 5 minutes)");
        localStorage.removeItem("checkout_in_progress");
        localStorage.removeItem("checkout_start_time");
        CHECKOUT_IN_PROGRESS = false;

        // Clear global lock if it exists
        if (typeof window !== "undefined" && window.GLOBAL_CHECKOUT_LOCK) {
          window.GLOBAL_CHECKOUT_LOCK = false;
        }
      }
    }
  };

  // Check subscription status whenever auth state changes
  useEffect(() => {
    if (!user || authLoading) return;

    const checkSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // If user is admin, they always have access
        if (isAdminUser) {
          setSubscriptionStatus({
            isActive: true,
            subscriptions: [],
            loading: false,
            error: null,
          });
          return;
        }

        const db = getFirestore();
        if (!db) {
          throw new Error("Firestore not initialized");
        }

        // Check for active subscriptions
        const subscriptionsRef = collection(
          db,
          "customers",
          user.uid,
          "subscriptions"
        );
        const q = query(
          subscriptionsRef,
          where("status", "in", ["trialing", "active"])
        );
        const snapshot = await getDocs(q);

        // Get all subscriptions for detailed info
        const allSubscriptions = await getDocs(subscriptionsRef);
        const subscriptions = allSubscriptions.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSubscriptionStatus({
          isActive: !snapshot.empty,
          subscriptions,
          loading: false,
          error: null,
        });
      } catch (err) {
        const appError = errorHandler.handle(err, "checkSubscription");
        setError(appError.message);
        setSubscriptionStatus({
          isActive: false,
          subscriptions: [],
          loading: false,
          error: appError.message,
        });
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, authLoading, isAdminUser]);

  // Cleanup effect to ensure we don't leave dangling locks
  useEffect(() => {
    // Clear stale checkout flags on mount
    clearStaleCheckoutFlags();

    return () => {
      // Cancel any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Generate a unique checkout ID to track this specific checkout
  const generateCheckoutId = (userId: string, priceId: string): string => {
    return `${userId}_${priceId}_${Date.now()}`;
  };

  // Simplified checkout function with enhanced safeguards
  const createCheckoutSession = useCallback(
    async (priceId: string) => {
      try {
        // Check for user authentication
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Check for multiple rapid attempts (global state)
        const now = Date.now();
        if (now - lastCheckoutAttempt.current < 3000) {
          console.warn("Checkout throttled - too many rapid attempts");
          toast.error("Please wait before trying again");
          return;
        }
        lastCheckoutAttempt.current = now;

        // Increment request counter - if too many, block
        checkoutRequestCount.current += 1;
        if (checkoutRequestCount.current > 3) {
          console.warn("Too many checkout attempts");
          toast.error("Too many checkout attempts. Please refresh the page.");
          return;
        }

        // Check both localStorage and module-level variable for locks
        clearStaleCheckoutFlags();

        if (
          localStorage.getItem("checkout_in_progress") ||
          CHECKOUT_IN_PROGRESS ||
          (typeof window !== "undefined" && window.GLOBAL_CHECKOUT_LOCK)
        ) {
          console.warn("Checkout already in progress");
          toast.error(
            "A checkout is already in progress. Please wait or refresh the page."
          );
          return;
        }

        // Generate a unique checkout ID
        const checkoutId = generateCheckoutId(user.uid, priceId);

        // Check for duplicate checkouts
        if (ACTIVE_CHECKOUT_IDS.has(checkoutId)) {
          console.warn("Duplicate checkout detected", checkoutId);
          toast.error("Checkout already initiated. Please wait.");
          return;
        }

        // Set all locks
        localStorage.setItem("checkout_in_progress", "true");
        localStorage.setItem("checkout_start_time", Date.now().toString());
        CHECKOUT_IN_PROGRESS = true;
        ACTIVE_CHECKOUT_IDS.add(checkoutId);

        // Add global lock if window is available
        if (typeof window !== "undefined") {
          window.GLOBAL_CHECKOUT_LOCK = true;
        }

        setLoading(true);
        setError(null);
        toast.loading("Preparing checkout...");

        // Create a new abort controller for this request
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        // Add timeout for the fetch request
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            toast.error("Checkout request timed out. Please try again.");

            // Clear all locks
            localStorage.removeItem("checkout_in_progress");
            localStorage.removeItem("checkout_start_time");
            CHECKOUT_IN_PROGRESS = false;
            ACTIVE_CHECKOUT_IDS.delete(checkoutId);

            if (typeof window !== "undefined") {
              window.GLOBAL_CHECKOUT_LOCK = false;
            }
          }
        }, 30000); // 30 second timeout

        try {
          const response = await fetch("/api/stripe/create-checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              priceId: priceId,
              successUrl: window.location.origin + "/payment-success",
              cancelUrl: window.location.origin + "/pricing",
              checkoutId: checkoutId, // Pass checkoutId to API for tracking
            }),
            signal,
          });

          // Clear the timeout
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to parse error response" }));
            throw new Error(errorData.error || `API error: ${response.status}`);
          }

          const { url } = await response.json();
          if (!url) {
            throw new Error("No checkout URL returned from the API");
          }

          toast.dismiss();
          toast.success("Redirecting to Stripe checkout...");

          // Store the checkout ID for verification on return
          localStorage.setItem("checkout_session_id", checkoutId);

          // Wait a brief moment before redirecting to ensure toasts are visible
          setTimeout(() => {
            window.location.href = url;
          }, 500);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (err) {
        const appError = errorHandler.handle(err, "createCheckoutSession");
        setError(appError.message);
        toast.dismiss();
        toast.error(`Checkout error: ${appError.message}`);

        // Clear all checkout flags and locks in case of error
        localStorage.removeItem("checkout_in_progress");
        localStorage.removeItem("checkout_start_time");
        CHECKOUT_IN_PROGRESS = false;

        if (typeof window !== "undefined") {
          window.GLOBAL_CHECKOUT_LOCK = false;
        }
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Customer portal access
  const openCustomerPortal = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      setLoading(true);
      setError(null);
      const loadingToast = toast.loading("Preparing customer portal...");

      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const { url, error: apiError } = await response.json();
      if (apiError) {
        throw new Error(apiError);
      }

      toast.success("Redirecting to customer portal...");
      window.location.href = url;
    } catch (err) {
      const appError = errorHandler.handle(err, "openCustomerPortal");
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    ...subscriptionStatus,
    loading: loading || subscriptionStatus.loading,
    error: error || subscriptionStatus.error,
    createCheckoutSession,
    openCustomerPortal,
  };
}

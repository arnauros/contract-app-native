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
    console.log("🔄 useSubscription useEffect triggered", {
      user: user?.email,
      authLoading,
      isAdminUser,
    });

    if (!user || authLoading) {
      console.log("⏳ useSubscription: Waiting for user/auth", {
        user: !!user,
        authLoading,
      });
      return;
    }

    const checkSubscription = async () => {
      try {
        console.log(
          "🔍 useSubscription: Starting subscription check for user",
          user.email
        );
        setLoading(true);
        setError(null);

        // If user is admin, they always have access
        if (isAdminUser) {
          console.log("👑 useSubscription: User is admin, granting access");
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

        console.log(
          "🔥 useSubscription: Firestore initialized, checking subscriptions for user",
          user.uid
        );

        // First approach: Check for active subscriptions in the subscriptions subcollection
        let isActive = false;
        let subscriptions: any[] = [];

        try {
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
          console.log("📊 useSubscription: Querying active subscriptions...");
          const snapshot = await getDocs(q);

          // Get all subscriptions for detailed info
          const allSubscriptions = await getDocs(subscriptionsRef);
          subscriptions = allSubscriptions.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          isActive = !snapshot.empty;
          console.log("📊 useSubscription: Subscription check result", {
            isActive,
            subscriptionCount: subscriptions.length,
            activeSubscriptionCount: snapshot.size,
          });
        } catch (subError) {
          console.warn("Error checking subscriptions subcollection:", subError);
          // Continue to fallback approach
        }

        // Second approach (fallback): Check user document for subscription field
        if (!isActive) {
          try {
            console.log(
              "📄 useSubscription: Checking user document for subscription status"
            );
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log("📄 useSubscription: User document data", {
                hasSubscription: !!userData?.subscription,
                subscriptionStatus: userData?.subscription?.status,
              });
              if (userData?.subscription) {
                const status = userData.subscription.status;
                isActive = status === "active" || status === "trialing";

                if (isActive) {
                  console.log(
                    "✅ useSubscription: Found active subscription in user document"
                  );
                  // Add the subscription from user doc to the list
                  subscriptions.push({
                    id: userData.subscription.subscriptionId || "unknown",
                    status: userData.subscription.status,
                    ...userData.subscription,
                  });
                } else {
                  console.log(
                    "❌ useSubscription: User document subscription not active",
                    { status }
                  );
                }
              } else {
                console.log(
                  "❌ useSubscription: No subscription field in user document"
                );
              }
            } else {
              console.log("❌ useSubscription: User document does not exist");
            }
          } catch (userDocError) {
            console.error(
              "❌ useSubscription: Error checking user document:",
              userDocError
            );
            // If both approaches fail, we'll return not active
          }
        }

        console.log("🎯 useSubscription: Final subscription status", {
          isActive,
          subscriptionCount: subscriptions.length,
          loading: false,
        });

        setSubscriptionStatus({
          isActive,
          subscriptions,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("❌ useSubscription: Error in subscription check:", err);
        const appError = errorHandler.handle(err, "checkSubscription");
        setError(appError.message);
        setSubscriptionStatus({
          isActive: false,
          subscriptions: [],
          loading: false,
          error: appError.message,
        });
      } finally {
        console.log("🏁 useSubscription: Subscription check completed");
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
    async (priceId: string, promotionCodeId?: string) => {
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

        // Reset all checkout locks to start fresh
        localStorage.removeItem("checkout_in_progress");
        localStorage.removeItem("checkout_start_time");
        CHECKOUT_IN_PROGRESS = false;

        if (typeof window !== "undefined") {
          window.GLOBAL_CHECKOUT_LOCK = false;
        }

        // Short delay to ensure locks are cleared
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Generate a unique checkout ID
        const checkoutId = generateCheckoutId(user.uid, priceId);

        // Check for duplicate checkouts
        if (ACTIVE_CHECKOUT_IDS.has(checkoutId)) {
          console.warn("Duplicate checkout detected", checkoutId);
          toast.error("Checkout already initiated. Please wait.");
          return;
        }

        // Set all locks after check
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

        // Better error handling for production
        try {
          // Validate inputs before sending to server
          if (!priceId || !priceId.startsWith("price_")) {
            throw new Error("Invalid price ID format");
          }

          // Prepare the request with the user's information
          const requestBody = {
            userId: user.uid,
            priceId,
            checkoutId,
            ...(promotionCodeId && { promotionCodeId }),
          };

          console.log("Sending checkout request with payload:", requestBody);

          // Make the API request to create a checkout session
          const response = await fetch("/api/stripe/create-checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal,
          });

          // Clear the timeout since we got a response
          clearTimeout(timeoutId);

          // Throw error on non-200 responses
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `Server error: ${response.status}`
            );
          }

          // Process the successful response
          const { url, sessionId } = await response.json();

          // Guard against missing URL
          if (!url) {
            throw new Error("No checkout URL returned from server");
          }

          // Log before redirect for debugging
          console.log(
            `Redirecting to Stripe checkout: ${url.substring(0, 50)}...`
          );

          // Store the session ID in localStorage for post-payment verification
          localStorage.setItem("checkout_session_id", sessionId);
          localStorage.setItem("checkout_price_id", priceId);

          // Redirect the user to Stripe Checkout
          window.location.href = url;

          // Return true to indicate success
          return true;
        } catch (error: any) {
          // Clear the timeout if there was an error
          clearTimeout(timeoutId);

          // Handle errors and clean up
          console.error("Error creating checkout session:", error);

          // Improve error handling and reporting
          const appError = errorHandler.handle(error, "createCheckoutSession");
          setError(appError.message);

          // Show user-friendly error
          toast.error(
            appError.message || "Failed to start checkout. Please try again."
          );

          // Clean up locks and state
          setLoading(false);
          localStorage.removeItem("checkout_in_progress");
          localStorage.removeItem("checkout_start_time");
          CHECKOUT_IN_PROGRESS = false;
          ACTIVE_CHECKOUT_IDS.delete(checkoutId);

          if (typeof window !== "undefined") {
            window.GLOBAL_CHECKOUT_LOCK = false;
          }

          // Re-throw for upstream handlers
          throw error;
        }
      } catch (err) {
        // Final error catching and reporting
        const appError = errorHandler.handle(err, "createCheckoutSession");
        setError(appError.message);
        setLoading(false);
        return false;
      } finally {
        // Always reset the loading state
        setLoading(false);
      }
    },
    [user, clearStaleCheckoutFlags]
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

      // Try the main portal API first, fallback to client-side API
      let response = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      // If the main API fails due to Firebase Admin not being configured, try client-side API
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (
          errorData.error &&
          errorData.error.includes("Firebase Admin not configured")
        ) {
          console.log(
            "Firebase Admin not available, trying client-side API..."
          );

          // Get user's Stripe customer ID from Firestore client-side
          const { getFirestore, doc, getDoc } = await import(
            "firebase/firestore"
          );
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (
              userData.stripeCustomerId &&
              !userData.stripeCustomerId.startsWith("mock_")
            ) {
              response = await fetch("/api/stripe/create-portal-client", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: user.uid,
                  stripeCustomerId: userData.stripeCustomerId,
                }),
              });
            }
          }
        }
      }

      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));

        // Check for specific Stripe configuration error
        if (errorData.error && errorData.error.includes("configuration")) {
          toast.error(
            "Stripe customer portal not configured in test mode. Please check Stripe dashboard."
          );
          console.error("Stripe Portal Error:", errorData.error);

          // Show more helpful message for developers
          if (process.env.NODE_ENV === "development") {
            toast.error(
              "Developer: Configure portal at https://dashboard.stripe.com/test/settings/billing/portal"
            );
          }

          return false;
        }

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
      throw err; // Rethrow to allow handling in the component
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add a function to synchronize subscription status
  const synchronizeSubscription = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      setLoading(true);
      setError(null);
      const loadingToast = toast.loading(
        "Synchronizing subscription status..."
      );

      // Step 1: Call verify-subscription endpoint
      const verifyResponse = await fetch("/api/stripe/verify-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!verifyResponse.ok) {
        toast.dismiss(loadingToast);
        const errorData = await verifyResponse
          .json()
          .catch(() => ({ error: "Failed to verify subscription" }));
        throw new Error(
          errorData.error || `API error: ${verifyResponse.status}`
        );
      }

      const verifyData = await verifyResponse.json();

      // Step 2: Reset claims via the reset-claims endpoint
      const resetResponse = await fetch("/api/debug/reset-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!resetResponse.ok) {
        toast.dismiss(loadingToast);
        const errorData = await resetResponse
          .json()
          .catch(() => ({ error: "Failed to reset claims" }));
        throw new Error(
          errorData.error || `API error: ${resetResponse.status}`
        );
      }

      const resetData = await resetResponse.json();

      // Step 3: Force refresh the token
      await user.getIdToken(true);

      // Step 4: Update the cookie on the client side to ensure it's in sync
      // This is necessary especially for the case where a user cancels and then resubscribes
      if (typeof window !== "undefined" && verifyData?.isActive) {
        // Import Cookies if it's not already imported at the top
        const Cookies = (await import("js-cookie")).default;

        // Set the cookie value to match what's in Firebase Auth claims
        Cookies.set("subscription_status", "active", {
          expires: 30, // 30 days
          path: "/",
        });

        console.log("Updated subscription_status cookie to 'active'");
      }

      toast.dismiss(loadingToast);
      toast.success("Subscription synchronized successfully");

      // Reload the page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, "synchronizeSubscription");
      setError(appError.message);
      toast.error(appError.message || "Failed to synchronize subscription");
      return false;
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
    synchronizeSubscription,
  };
}

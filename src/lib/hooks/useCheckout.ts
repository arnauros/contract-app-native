import { useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import toast from "react-hot-toast";
import { errorHandler } from "@/lib/utils";

// Set to track active checkout IDs
const ACTIVE_CHECKOUT_IDS = new Set<string>();
let CHECKOUT_IN_PROGRESS = false;

export function useCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // References for tracking checkout attempts
  const lastCheckoutAttempt = useRef<number>(0);
  const checkoutRequestCount = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate a unique checkout ID
  const generateCheckoutId = (userId: string, priceId: string): string => {
    return `${userId}_${priceId}_${Date.now()}`;
  };

  // Clear stale checkout flags
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

        if (typeof window !== "undefined" && window.GLOBAL_CHECKOUT_LOCK) {
          window.GLOBAL_CHECKOUT_LOCK = false;
        }
      }
    }
  };

  // Create checkout session
  const createCheckoutSession = useCallback(
    async (priceId: string, promotionCodeId?: string) => {
      try {
        // Check for user authentication
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Check for multiple rapid attempts
        const now = Date.now();
        if (now - lastCheckoutAttempt.current < 3000) {
          console.warn("Checkout throttled - too many rapid attempts");
          toast.error("Please wait before trying again");
          return;
        }
        lastCheckoutAttempt.current = now;

        // Increment request counter
        checkoutRequestCount.current += 1;
        if (checkoutRequestCount.current > 3) {
          console.warn("Too many checkout attempts");
          toast.error("Too many checkout attempts. Please refresh the page.");
          return;
        }

        // Clear stale checkout flags
        clearStaleCheckoutFlags();

        // Reset checkout locks
        localStorage.removeItem("checkout_in_progress");
        localStorage.removeItem("checkout_start_time");
        CHECKOUT_IN_PROGRESS = false;

        if (typeof window !== "undefined") {
          window.GLOBAL_CHECKOUT_LOCK = false;
        }

        // Short delay to ensure locks are cleared
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Generate checkout ID
        const checkoutId = generateCheckoutId(user.uid, priceId);

        // Check for duplicate checkouts
        if (ACTIVE_CHECKOUT_IDS.has(checkoutId)) {
          console.warn("Duplicate checkout detected", checkoutId);
          toast.error("Checkout already initiated. Please wait.");
          return;
        }

        // Set locks
        localStorage.setItem("checkout_in_progress", "true");
        localStorage.setItem("checkout_start_time", Date.now().toString());
        CHECKOUT_IN_PROGRESS = true;
        ACTIVE_CHECKOUT_IDS.add(checkoutId);

        if (typeof window !== "undefined") {
          window.GLOBAL_CHECKOUT_LOCK = true;
        }

        setLoading(true);
        setError(null);

        // Create abort controller
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        // Set timeout for request
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            toast.error("Checkout request timed out. Please try again.");

            // Clear locks
            localStorage.removeItem("checkout_in_progress");
            localStorage.removeItem("checkout_start_time");
            CHECKOUT_IN_PROGRESS = false;
            ACTIVE_CHECKOUT_IDS.delete(checkoutId);

            if (typeof window !== "undefined") {
              window.GLOBAL_CHECKOUT_LOCK = false;
            }
          }
        }, 30000);

        try {
          // Make API request
          const response = await fetch("/api/stripe/create-checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              priceId: priceId,
              successUrl:
                window.location.origin + "/payment-success?t=" + Date.now(),
              cancelUrl: window.location.origin + "/pricing",
              checkoutId: checkoutId,
              ...(promotionCodeId && { promotionCodeId }),
            }),
            signal,
          });

          // Clear timeout
          clearTimeout(timeoutId);

          // Handle response
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

          // Store checkout ID
          localStorage.setItem("checkout_session_id", checkoutId);

          // Redirect to Stripe
          setTimeout(() => {
            window.location.href = url;
          }, 500);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (err) {
        // Handle error
        const appError = errorHandler.handle(err, "createCheckoutSession");
        setError(appError.message);
        toast.dismiss();
        toast.error(`Checkout error: ${appError.message}`);

        // Clear locks
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

  // Function to open customer portal
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
    createCheckoutSession,
    openCustomerPortal,
    loading,
    error,
  };
}

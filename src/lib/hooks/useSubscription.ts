import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { getStripe, validatePriceIds } from "@/lib/stripe/config";
import { UserSubscription } from "@/lib/stripe/config";

export function useSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = async (priceId: string) => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First validate environment variables
      if (!validatePriceIds()) {
        setError(
          "Stripe price IDs are not properly configured. Please check your environment variables."
        );
        return;
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const { sessionId, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error(
          "Failed to load Stripe. Check your Stripe publishable key configuration."
        );
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const { url, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (err) {
      console.error("Portal error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createCheckoutSession,
    openCustomerPortal,
  };
}

"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import { errorHandler } from "@/lib/utils";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const {
    isActive,
    loading: subscriptionLoading,
    error,
    createCheckoutSession,
  } = useSubscription();

  useEffect(() => {
    if (authLoading || subscriptionLoading) return;

    // If no user, redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // If admin or has active subscription, allow access
    if (isAdmin || isActive) {
      return;
    }

    // If error occurred, show error and redirect to pricing
    if (error) {
      toast.error(
        "Error checking subscription status. Redirecting to pricing."
      );
      router.push("/pricing");
      return;
    }

    // No active subscription, redirect to checkout
    toast.error("You need an active subscription to access this content");
    redirectToCheckout();
  }, [
    user,
    authLoading,
    subscriptionLoading,
    isActive,
    error,
    router,
    isAdmin,
  ]);

  // Function to redirect user directly to Stripe checkout
  const redirectToCheckout = async () => {
    try {
      if (!user) {
        router.push("/login");
        return;
      }

      // Use the centralized checkout function instead of duplicating logic
      await createCheckoutSession(STRIPE_PRICE_IDS.MONTHLY);
    } catch (error) {
      errorHandler.handle(error, "SubscriptionGuard.redirectToCheckout");
      router.push("/pricing");
    }
  };

  // Show loading state
  if (authLoading || subscriptionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // If subscription is valid or admin, render children
  if (isActive || isAdmin) {
    return <>{children}</>;
  }

  // Otherwise return null (component will redirect in useEffect)
  return null;
}

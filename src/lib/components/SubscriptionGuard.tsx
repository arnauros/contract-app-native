"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useSubscription } from "@/lib/hooks/useSubscription";
import Cookies from "js-cookie";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const {
    isActive,
    loading: subscriptionLoading,
    error,
    subscriptions,
  } = useSubscription();
  const [accessChecked, setAccessChecked] = useState(false);
  const [directCheckPerformed, setDirectCheckPerformed] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Function to check if a canceled subscription is still within its grace period
  const isWithinGracePeriod = () => {
    if (!subscriptions || subscriptions.length === 0) return false;

    // Look for canceled subscriptions
    const canceledSubscription = subscriptions.find(
      (sub) => sub.status === "canceled" && sub.currentPeriodEnd
    );

    if (canceledSubscription) {
      const now = Date.now();
      const endDate = canceledSubscription.currentPeriodEnd;

      // If the end date is in the future, the user still has access
      return now < endDate;
    }

    return false;
  };

  // Function to check the subscription_status cookie
  const hasCookieAccess = () => {
    const cookieValue = Cookies.get("subscription_status");
    console.log(
      "SubscriptionGuard: Cookie check - subscription_status =",
      cookieValue
    );
    return cookieValue === "active";
  };

  // Function to directly verify the subscription status as a fallback
  const verifySubscriptionDirectly = async () => {
    if (!user || directCheckPerformed) return false;

    try {
      console.log("SubscriptionGuard: Performing direct subscription check");
      setDirectCheckPerformed(true);

      // Call the direct verification endpoint
      const response = await fetch("/api/stripe/verify-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        console.error("Failed to verify subscription:", response.status);
        return false;
      }

      const data = await response.json();
      console.log("SubscriptionGuard: Direct verification result:", data);

      // If the subscription was updated from Stripe directly
      if (data.wasUpdatedFromStripe) {
        console.log(
          "SubscriptionGuard: Subscription was updated from Stripe directly - reloading page"
        );
        // Reload the page to get the updated subscription status
        window.location.reload();
        return true;
      }

      // If the subscription is active, grant access
      if (data.isActive) {
        console.log(
          "SubscriptionGuard: Subscription verified as active directly"
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error in direct subscription verification:", error);
      return false;
    }
  };

  // Handle access checking and redirects in useEffect, not during render
  useEffect(() => {
    // Don't do anything while loading
    if (authLoading || subscriptionLoading) {
      console.log("SubscriptionGuard: Still loading, skipping access check");
      return;
    }

    // If we've already checked access, don't repeat
    if (accessChecked) {
      console.log(
        `SubscriptionGuard: Access already checked, hasAccess: ${hasAccess}`
      );
      return;
    }

    // If no user, redirect to login
    if (!user) {
      console.log("SubscriptionGuard: No user, redirecting to login");
      router.push("/login");
      return;
    }

    // First, check the cookie directly - this is the fastest way and accounts for
    // the case where a user cancels and resubscribes
    const cookieAccess = hasCookieAccess();
    console.log(`SubscriptionGuard: Cookie access check: ${cookieAccess}`);

    if (cookieAccess) {
      console.log("SubscriptionGuard: Access granted via cookie");
      setHasAccess(true);
      setAccessChecked(true);
      return;
    }

    // If error in subscription check, try direct verification before redirecting
    if (error) {
      console.warn(
        "Error in subscription check, attempting direct verification:",
        error
      );

      verifySubscriptionDirectly().then((directAccessGranted) => {
        if (directAccessGranted) {
          console.log(
            "SubscriptionGuard: Access granted via direct verification"
          );
          setHasAccess(true);
          setAccessChecked(true);
        } else {
          toast.error(
            "Error checking subscription status. Redirecting to pricing."
          );
          router.push("/pricing");
        }
      });

      return;
    }

    // Check if user has access - either admin, has active subscription or is within grace period
    const gracePeriodAccess = isWithinGracePeriod();
    const hasMainAccess = isAdmin || isActive || gracePeriodAccess;

    // Log complete state for debugging
    console.log("SubscriptionGuard: Access check state", {
      isAdmin,
      isActive,
      gracePeriodAccess,
      cookieAccess,
      hasMainAccess,
    });

    // If we have a definite answer through the normal subscription check
    if (hasMainAccess) {
      console.log("SubscriptionGuard: Access granted", {
        isAdmin,
        isActive,
        gracePeriodAccess,
      });
      setHasAccess(true);
      setAccessChecked(true);
    } else {
      // No access through the main check, try direct verification as a fallback
      console.log(
        "SubscriptionGuard: No access via normal check, attempting direct verification"
      );

      verifySubscriptionDirectly().then((directAccessGranted) => {
        if (directAccessGranted) {
          console.log(
            "SubscriptionGuard: Access granted via direct verification"
          );
          setHasAccess(true);
        } else {
          // Log access decision for debugging - with more detail
          console.log("SubscriptionGuard access decision:", {
            email: user?.email,
            isAdmin,
            isActive,
            gracePeriodAccess,
            cookieAccess,
            hasAccess: false,
            subscriptionLoadingState: subscriptionLoading,
            directCheckPerformed: true,
            error: error || "No error",
          });

          toast.error(
            "You don't have access to this content. This could be due to your subscription status."
          );
          router.push("/pricing");
        }

        setAccessChecked(true);
      });
    }
  }, [
    authLoading,
    subscriptionLoading,
    user,
    error,
    isAdmin,
    isActive,
    router,
    accessChecked,
    directCheckPerformed,
    subscriptions,
  ]);

  // Show loading state while auth or subscription data is loading
  if (authLoading || subscriptionLoading || (!accessChecked && !hasAccess)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // User has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Fallback loading state while waiting for redirect
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useSubscription } from "@/lib/hooks/useSubscription";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { isActive, loading: subscriptionLoading, error } = useSubscription();
  const [accessChecked, setAccessChecked] = useState(false);

  // Handle access checking and redirects in useEffect, not during render
  useEffect(() => {
    // Don't do anything while loading
    if (authLoading || subscriptionLoading) {
      return;
    }

    // If we've already checked access, don't repeat
    if (accessChecked) {
      return;
    }

    // If no user, redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // If error in subscription check, show error and redirect to pricing
    if (error) {
      toast.error(
        "Error checking subscription status. Redirecting to pricing."
      );
      router.push("/pricing");
      return;
    }

    // Check if user has access - either admin or has active subscription
    const hasAccess = isAdmin || isActive;

    // Log access decision for debugging
    console.log("SubscriptionGuard access decision:", {
      email: user?.email,
      isAdmin,
      isActive,
      hasAccess,
    });

    // No access - redirect immediately to pricing page
    if (!hasAccess) {
      toast.error("You need an active subscription to access this content");
      router.push("/pricing");
      return;
    }

    // Mark as checked to avoid duplicate redirects
    setAccessChecked(true);
  }, [
    authLoading,
    subscriptionLoading,
    user,
    error,
    isAdmin,
    isActive,
    router,
    accessChecked,
  ]);

  // Show loading state while auth or subscription data is loading
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

  // If no access yet but we're waiting for the redirect, show loading
  if (!accessChecked && (!user || error || !(isAdmin || isActive))) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

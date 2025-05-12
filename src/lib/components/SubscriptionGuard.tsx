"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSubscription } from "@/lib/hooks/useSubscription";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { isActive, loading: subscriptionLoading, error } = useSubscription();

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

  // If no user, redirect to login
  if (!user) {
    router.push("/login");
    return null;
  }

  // If error in subscription check, show error and redirect to pricing
  if (error) {
    toast.error("Error checking subscription status. Redirecting to pricing.");
    router.push("/pricing");
    return null;
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
    return null;
  }

  // User has access, render children
  return <>{children}</>;
}

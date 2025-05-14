"use client";

import { RouteGuard } from "@/lib/components/RouteGuard";
import { SubscriptionGuard } from "@/lib/components/SubscriptionGuard";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import ClientLayout from "@/app/Components/ClientLayout";
import { Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Global variable to prevent multiple ClientApp instances
let CLIENT_APP_MOUNTED = false;

export default function ClientApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Add a mounting ref to prevent duplicate effects
  const hasMounted = useRef(false);

  // Debug logging for the client app - only run once
  useEffect(() => {
    if (hasMounted.current) return;

    // Check if another ClientApp instance is already mounted
    if (typeof window !== "undefined" && CLIENT_APP_MOUNTED) {
      console.warn(
        "Multiple ClientApp instances detected - this should not happen"
      );
      hasMounted.current = true;
      return;
    }

    console.log("ClientApp mounted, pathname:", pathname);
    hasMounted.current = true;

    if (typeof window !== "undefined") {
      CLIENT_APP_MOUNTED = true;
    }

    // Clean up any stale flags that might be lingering
    if (typeof window !== "undefined") {
      localStorage.removeItem("checkout_in_progress");
      localStorage.removeItem("checkout_start_time");
      localStorage.removeItem("last_checkout_redirect_time");
      // @ts-ignore - these globals are added dynamically
      window.GLOBAL_CHECKOUT_LOCK = false;
      // @ts-ignore
      window.GLOBAL_REDIRECT_IN_PROGRESS = false;
    }

    return () => {
      console.log("ClientApp unmounting");
      if (typeof window !== "undefined") {
        CLIENT_APP_MOUNTED = false;
      }
    };
  }, [pathname]);

  // Simple fallback loading component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      <p className="ml-2">Loading application...</p>
    </div>
  );

  // Determine if current route should be subscription-protected
  // Check just once on component mount
  const isSubscriptionProtectedRoute = useRef(
    pathname &&
      (pathname.includes("/dashboard") ||
        pathname.startsWith("/Contracts/") ||
        pathname === "/profile" ||
        pathname === "/new" ||
        pathname === "/store")
  ).current;

  // Log whether this route requires subscription - only log once
  useEffect(() => {
    if (!hasMounted.current) return;

    console.log("Route protection:", {
      path: pathname,
      requiresSubscription: isSubscriptionProtectedRoute,
    });
  }, [pathname, isSubscriptionProtectedRoute]);

  // If in a subscription-protected route, wrap with SubscriptionGuard
  const wrappedContent = isSubscriptionProtectedRoute ? (
    <SubscriptionGuard>
      <SidebarProvider>
        <ClientLayout>{children}</ClientLayout>
      </SidebarProvider>
    </SubscriptionGuard>
  ) : (
    <SidebarProvider>
      <ClientLayout>{children}</ClientLayout>
    </SidebarProvider>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteGuard>{wrappedContent}</RouteGuard>
    </Suspense>
  );
}

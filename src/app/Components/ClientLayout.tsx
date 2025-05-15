"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/app/(dashboard)/topbar";
import Sidebar from "@/app/(dashboard)/sidebar";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FirebaseError } from "firebase/app";

// Global map to track rendered paths
declare global {
  interface Window {
    __RENDERED_PATHS?: Map<string, boolean>;
    __PRICING_IN_CLIENT_LAYOUT?: boolean;
    __LAST_ERROR_TIME?: Record<string, number>;
  }
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const instanceRef = useRef(Math.random().toString(36).substring(2, 15));
  const isViewRoute = pathname?.startsWith("/view/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isLandingPage =
    pathname === "/" || pathname === "/pricing" || pathname === "/about";
  const [errorDebounce] = useState<Map<string, number>>(new Map());

  // Special handler for pricing page to prevent double rendering
  const isPricingPage = pathname === "/pricing";

  // Check for duplicate rendering of the same path
  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    // Initialize the rendered paths map if it doesn't exist
    if (!window.__RENDERED_PATHS) {
      window.__RENDERED_PATHS = new Map();
    }

    // Special case for pricing page
    if (isPricingPage) {
      if (window.__PRICING_IN_CLIENT_LAYOUT) {
        console.warn(
          "Pricing page already rendered through ClientLayout - avoiding duplicate render"
        );
        return;
      }
      window.__PRICING_IN_CLIENT_LAYOUT = true;
    }

    // Check if this path is already being rendered by another instance
    const pathKey = `${pathname}`;
    const isAlreadyRendered = window.__RENDERED_PATHS.has(pathKey);

    if (isAlreadyRendered) {
      console.warn(
        `Path ${pathname} is already being rendered by another ClientLayout instance`
      );
    } else {
      // Mark this path as being rendered
      window.__RENDERED_PATHS.set(pathKey, true);
    }

    return () => {
      // When unmounting, remove this path from the rendered paths
      if (window.__RENDERED_PATHS) {
        window.__RENDERED_PATHS.delete(pathKey);
      }

      // Clean up pricing page flag
      if (isPricingPage) {
        window.__PRICING_IN_CLIENT_LAYOUT = false;
      }
    };
  }, [pathname, isPricingPage]);

  // Utility function to check if we should show an error toast
  const shouldShowErrorToast = (errorCode: string): boolean => {
    // Initialize error time tracking
    if (typeof window !== "undefined" && !window.__LAST_ERROR_TIME) {
      window.__LAST_ERROR_TIME = {};
    }

    const now = Date.now();
    const lastErrorTime = window.__LAST_ERROR_TIME?.[errorCode] || 0;

    // Only show error if it hasn't been shown in the last 5 seconds
    if (now - lastErrorTime > 5000) {
      if (window.__LAST_ERROR_TIME) {
        window.__LAST_ERROR_TIME[errorCode] = now;
      }
      return true;
    }

    return false;
  };

  // Add global error handling
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Special handling for Firebase errors
      if (event.reason instanceof FirebaseError) {
        const fbError = event.reason as FirebaseError;
        console.error("Firebase error code:", fbError.code);

        // Debounce error messages to prevent flooding
        if (shouldShowErrorToast(fbError.code)) {
          if (fbError.code === "permission-denied") {
            // Only show a user-friendly message for permission-denied errors on subscription-debug page
            if (!pathname?.includes("subscription-debug")) {
              toast.error(
                "You don't have access to this content. This could be due to your subscription status."
              );
            }
          } else if (
            fbError.code === "unauthenticated" ||
            fbError.code === "auth/unauthenticated"
          ) {
            toast.error("Your session has expired. Please log in again.");
          } else {
            // Only show detailed firebase errors in development
            const isDev = process.env.NODE_ENV === "development";
            toast.error(
              isDev
                ? `Firebase error: ${fbError.message}`
                : "Something went wrong"
            );
          }
        }
      } else {
        // Show a generic toast notification for other errors, but avoid flooding
        const errorMessage = event.reason?.message || "Something went wrong";
        const errorKey = `error-${errorMessage.substring(0, 20)}`;

        if (shouldShowErrorToast(errorKey)) {
          toast.error("Something went wrong");
        }
      }

      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);

      // Debounce generic errors too
      const errorKey = `error-${
        event.error?.message?.substring(0, 20) || "generic"
      }`;
      if (shouldShowErrorToast(errorKey)) {
        // Show a toast notification for the error
        toast.error("An error occurred");
      }

      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Add event listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    // Clean up event listeners
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, [pathname]);

  // For view routes and landing page, return children directly without layout
  if (isViewRoute || isLandingPage) {
    return children;
  }

  return (
    <div className="flex min-h-screen">
      {!isAuthRoute && (
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {!isAuthRoute && <Topbar pathname={pathname || ""} />}
        <main className="flex-1 pt-14">{children}</main>
      </div>
    </div>
  );
}

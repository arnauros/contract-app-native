"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/app/(dashboard)/topbar";
import Sidebar from "@/app/(dashboard)/sidebar";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { FirebaseError } from "firebase/app";

// Global map to track rendered paths
declare global {
  interface Window {
    __RENDERED_PATHS?: Map<string, boolean>;
    __PRICING_IN_CLIENT_LAYOUT?: boolean;
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

  // Add global error handling
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Special handling for Firebase errors
      if (event.reason instanceof FirebaseError) {
        const fbError = event.reason as FirebaseError;
        console.error("Firebase error code:", fbError.code);

        if (fbError.code === "permission-denied") {
          toast.error(
            "Firebase permissions error. Please check your authentication."
          );
        } else {
          toast.error(`Firebase error: ${fbError.message}`);
        }
      } else {
        // Show a generic toast notification for other errors
        toast.error("Something went wrong");
      }

      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);

      // Show a toast notification for the error
      toast.error("An error occurred");

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
  }, []);

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

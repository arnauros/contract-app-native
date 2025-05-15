"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initFirebase } from "@/lib/firebase/firebase";

// Global cleanup function to reset checkout state
const resetCheckoutState = () => {
  if (typeof window === "undefined") return;

  // Reset global flags
  if (window.GLOBAL_CHECKOUT_LOCK) {
    console.log("RootLayout: Resetting global checkout lock");
    window.GLOBAL_CHECKOUT_LOCK = false;
  }

  // Reset localStorage checkout flags
  const checkoutFlags = [
    "checkout_in_progress",
    "subscription_intent",
    "checkout_start_time",
    "checkout_session_id",
  ];

  // Only clear flags that might be stale (older than 5 minutes)
  const now = Date.now();
  const checkoutTimestamp = localStorage.getItem("checkout_timestamp");
  const timestampValue = checkoutTimestamp
    ? parseInt(checkoutTimestamp, 10)
    : 0;

  if (now - timestampValue > 5 * 60 * 1000) {
    checkoutFlags.forEach((flag) => {
      if (localStorage.getItem(flag)) {
        console.log(`RootLayout: Clearing stale checkout flag: ${flag}`);
        localStorage.removeItem(flag);
      }
    });

    // Update timestamp
    localStorage.setItem("checkout_timestamp", now.toString());
  }
};

// Configure CORS for Firebase Storage
const configureCORS = () => {
  if (typeof window === "undefined") return;

  // This will ensure Firebase is initialized with our CORS fixes
  initFirebase();

  // Add a custom response handler for CORS preflight requests
  const originalXHROpen = XMLHttpRequest.prototype.open;

  // Override with type-safe implementation
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ) {
    // Add event listener to handle CORS issues
    if (
      typeof url === "string" &&
      url.includes("firebasestorage.googleapis.com")
    ) {
      this.addEventListener("error", function () {
        console.warn("CORS error detected on Firebase Storage XHR:", url);
      });
    }

    // Call the original method with correct types
    return originalXHROpen.call(
      this,
      method,
      url,
      async,
      username || null,
      password || null
    );
  };
};

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Reset checkout state on first load and configure CORS
  useEffect(() => {
    resetCheckoutState();
    configureCORS();
  }, []);

  // Also reset checkout state when navigating between major sections
  useEffect(() => {
    if (pathname) {
      resetCheckoutState();
    }
  }, [pathname]);

  return <>{children}</>;
}

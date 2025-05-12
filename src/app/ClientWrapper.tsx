"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Reset checkout state on first load
  useEffect(() => {
    resetCheckoutState();
  }, []);

  // Also reset checkout state when navigating between major sections
  useEffect(() => {
    if (pathname) {
      resetCheckoutState();
    }
  }, [pathname]);

  return <>{children}</>;
}

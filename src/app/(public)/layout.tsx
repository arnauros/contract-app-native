"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";

// Create a global registry to track rendered public routes
declare global {
  interface Window {
    __PUBLIC_ROUTES_RENDERED?: Map<string, string>;
    GLOBAL_CHECKOUT_LOCK?: boolean;
    __CHECKOUT_FLAGS_CLEARED?: boolean;
  }
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const instanceId = useRef(Math.random().toString(36).substring(2, 15));
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Reset any stale checkout flags on first mount of public layout
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only do this once per session
    if (!window.__CHECKOUT_FLAGS_CLEARED) {
      // Reset all checkout related flags
      if (window.GLOBAL_CHECKOUT_LOCK) {
        console.log("PublicLayout: Clearing stale global checkout lock");
        window.GLOBAL_CHECKOUT_LOCK = false;
      }

      // Clear localStorage flags
      const checkoutFlags = [
        "checkout_in_progress",
        "subscription_intent",
        "last_checkout_attempt",
        "checkout_start_time",
        "checkout_session_id",
        "checkout_price_id",
      ];

      checkoutFlags.forEach((flag) => {
        if (localStorage.getItem(flag)) {
          console.log(`PublicLayout: Clearing stale flag: ${flag}`);
          localStorage.removeItem(flag);
        }
      });

      window.__CHECKOUT_FLAGS_CLEARED = true;
    }
  }, []);

  // Check for duplicate rendering on mount
  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    // Initialize the map if it doesn't exist
    if (!window.__PUBLIC_ROUTES_RENDERED) {
      window.__PUBLIC_ROUTES_RENDERED = new Map();
    }

    // Check if this path is already being rendered
    const existingInstance = window.__PUBLIC_ROUTES_RENDERED.get(pathname);
    if (existingInstance && existingInstance !== instanceId.current) {
      console.warn(
        `PublicLayout: Duplicate rendering detected for path ${pathname}`
      );
      // Mark as duplicate
      setIsDuplicate(true);
    } else {
      // Register this instance as the renderer for this path
      window.__PUBLIC_ROUTES_RENDERED.set(pathname, instanceId.current);
    }

    return () => {
      // Clean up on unmount
      if (
        window.__PUBLIC_ROUTES_RENDERED &&
        window.__PUBLIC_ROUTES_RENDERED.get(pathname) === instanceId.current
      ) {
        window.__PUBLIC_ROUTES_RENDERED.delete(pathname);
      }
    };
  }, [pathname]);

  // If this is a duplicate render, return null
  if (isDuplicate) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

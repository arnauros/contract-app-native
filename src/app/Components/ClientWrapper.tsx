"use client";

import dynamic from "next/dynamic";
import { Suspense, useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Global tracking for ClientWrapper instances by path
declare global {
  interface Window {
    __CLIENT_WRAPPERS_BY_PATH?: Map<string, string>;
  }
}

// Keep track of ClientWrapper instances
const clientAppInstances = { count: 0 };

// Dynamic import with no SSR to avoid hydration errors
const ClientApp = dynamic(() => import("@/app/Components/ClientApp"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
    </div>
  ),
});

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const instanceId = useRef(++clientAppInstances.count);
  const uniqueId = useRef(Math.random().toString(36).substring(2, 15));
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(true);

  // Prevent duplicate ClientWrapper instances for the same path
  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    // Initialize tracking map if needed
    if (!window.__CLIENT_WRAPPERS_BY_PATH) {
      window.__CLIENT_WRAPPERS_BY_PATH = new Map();
    }

    // Check if there's already a ClientWrapper for this path
    const existingWrapper = window.__CLIENT_WRAPPERS_BY_PATH.get(pathname);

    if (existingWrapper && existingWrapper !== uniqueId.current) {
      // This is a duplicate - don't render
      console.warn(
        `Duplicate ClientWrapper for path ${pathname} - not rendering instance ${instanceId.current}`
      );
      setShouldRender(false);
    } else {
      // Register this wrapper for this path
      window.__CLIENT_WRAPPERS_BY_PATH.set(pathname, uniqueId.current);

      if (instanceId.current > 1) {
        console.warn(
          `Multiple ClientWrapper instances detected (id: ${instanceId.current}, path: ${pathname})`
        );
      }
    }

    return () => {
      // Clean up on unmount - only if this is the registered wrapper for this path
      if (
        window.__CLIENT_WRAPPERS_BY_PATH &&
        window.__CLIENT_WRAPPERS_BY_PATH.get(pathname) === uniqueId.current
      ) {
        window.__CLIENT_WRAPPERS_BY_PATH.delete(pathname);
      }
      clientAppInstances.count--;
    };
  }, [pathname]);

  // Don't render if this is a duplicate instance
  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <ClientApp>{children}</ClientApp>
      <div id="modal-root" />
    </>
  );
}

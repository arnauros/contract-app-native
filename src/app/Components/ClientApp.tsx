"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/context/AuthContext";
import { RouteGuard } from "@/lib/components/RouteGuard";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import ClientLayout from "@/app/Components/ClientLayout";
import { initFirebase } from "@/lib/firebase/init";

export default function ClientApp({ children }: { children: React.ReactNode }) {
  // Initialize Firebase in client component
  useEffect(() => {
    try {
      initFirebase();
      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []);

  // Debug the current URL and force cache busting for root path
  useEffect(() => {
    console.log("ClientApp mounted, current URL:", window.location.href);

    // Add cache busting for the root path to prevent incorrect redirects
    if (
      window.location.pathname === "/" &&
      !window.location.href.includes("incognito=true")
    ) {
      // Only run this in non-incognito mode and only if we're at the root path
      const isAppDomain = window.location.hostname.includes("app.localhost");

      if (isAppDomain) {
        // If on app subdomain, redirect to dashboard
        console.log("Detected app subdomain, redirecting to dashboard...");
        window.location.href = "/dashboard";
      } else {
        // On regular domain, ensure we're showing the landing page
        // Cache busting by adding a unique param
        const hasQuery = window.location.href.includes("?");
        const cacheBuster = `${
          hasQuery ? "&" : "?"
        }incognito=true&t=${Date.now()}`;

        // Only reload if we haven't already added the cache buster
        if (!window.location.search.includes("incognito=true")) {
          console.log("Adding cache buster to prevent redirects...");
          window.location.href = window.location.pathname + cacheBuster;
        }
      }
    }
  }, []);

  return (
    <AuthProvider>
      <RouteGuard>
        <SidebarProvider>
          <ClientLayout>{children}</ClientLayout>
        </SidebarProvider>
      </RouteGuard>
    </AuthProvider>
  );
}

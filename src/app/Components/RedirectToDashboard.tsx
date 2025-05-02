"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Get the hostname and URL info
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const search = window.location.search;

    // If we have the cache busting parameter, don't redirect
    if (search.includes("incognito=true")) {
      console.log("🚫 Cache busting parameter detected, skipping redirects");
      return;
    }

    console.log("RedirectToDashboard running for:", { hostname, pathname });

    // Check if we're on the app subdomain
    const isAppSubdomain =
      hostname.includes("app.localhost") || hostname.includes("app.local");

    // Check if we're on the main domain (without app subdomain)
    const isMainDomain =
      hostname === "localhost" ||
      hostname === "local" ||
      hostname === "127.0.0.1";

    // ONLY handle app subdomain redirection
    // If we're on app.local or app.localhost and on the root path
    if (isAppSubdomain && pathname === "/") {
      console.log(
        "App subdomain detected at root path, redirecting to dashboard"
      );
      router.replace("/dashboard");
    }

    // If we're on the main domain, do absolutely nothing
    if (isMainDomain) {
      console.log("Main domain detected, NO redirection will be applied");
      // Do nothing - this is the landing page
      return;
    }
  }, [router]);

  return null; // This component doesn't render anything
}

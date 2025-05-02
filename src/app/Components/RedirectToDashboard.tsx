"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Get the hostname
    const hostname = window.location.hostname;

    // Check if we're on the app subdomain
    const isAppSubdomain =
      hostname.includes("app.local") || hostname.includes("app.localhost");

    // Check if we're on the main domain (without app subdomain)
    const isMainDomain = hostname === "localhost" || hostname === "local";

    // ONLY handle app subdomain redirection
    // If we're on app.local or app.localhost and on the root path
    if (isAppSubdomain && window.location.pathname === "/") {
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

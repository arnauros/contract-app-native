"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === "development";
  // Construct the appropriate URL based on environment
  const dashboardUrl = isDev
    ? "http://app.localhost:3001/dashboard"
    : "/dashboard"; // In production, middleware will handle the redirect

  useEffect(() => {
    // Log current URL for debugging
    console.log("Landing page mounted, current URL:", window.location.href);
    console.log("Current hostname:", window.location.hostname);

    // Completely disable all redirects for testing
    /*
    // Check if we're on app.local or app.localhost
    const hostname = window.location.hostname;

    // ONLY redirect if on app subdomain, NEVER redirect main domain
    if (hostname.includes("app.local") || hostname.includes("app.localhost")) {
      console.log("Detected app subdomain, redirecting to dashboard");
      router.push("/dashboard");
    }

    // For main domain, ensure we stay on the landing page
    if (hostname === "localhost" || hostname === "local") {
      console.log("On main domain landing page, staying here");
      // Do nothing - this is the landing page
    }
    */
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center flex-col">
      <div className="text-3xl font-bold mb-6">Welcome to our Landing Page</div>
      <div className="text-lg mb-8">
        This is the public-facing landing page on the main domain.
      </div>
      <div className="mt-4">
        <a
          href={dashboardUrl}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Go to Application Dashboard
        </a>
      </div>
    </div>
  );
}

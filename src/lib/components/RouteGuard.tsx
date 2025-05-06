"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/pricing", "/login", "/signup"]; // Public routes including pricing page

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isDevelopment, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRouteAuthorized, setIsRouteAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Debug logging
      console.log("⚡ ROUTE GUARD DEBUG ⚡");
      console.log("Current URL:", window.location.href);
      console.log("Current hostname:", window.location.hostname);
      console.log("Current pathname:", pathname);
      console.log("User authenticated:", !!user);
      console.log("Public routes:", publicRoutes);
      console.log(
        "Is public route:",
        publicRoutes.some((route) =>
          (pathname || "").toLowerCase().startsWith(route.toLowerCase())
        )
      );
      console.log("Is pricing page:", pathname === "/pricing");
    }

    if (loading) return;

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some((route) =>
      (pathname || "").toLowerCase().startsWith(route.toLowerCase())
    );

    // ALWAYS allow access to public routes
    if (isPublicRoute) {
      console.log("Public route - allowing access without auth check");
      setIsRouteAuthorized(true);
      return;
    }

    // For all other routes, require authentication regardless of domain
    if (!user) {
      console.log("Unauthorized access - redirecting to login");
      router.push("/login");
      return;
    }

    // If user is authenticated and trying to access login/signup, redirect to dashboard
    if (user && isPublicRoute && pathname !== "/") {
      console.log(
        "Authenticated user on public route - redirecting to dashboard"
      );
      router.push("/dashboard");
      return;
    }

    console.log("Route authorized");
    setIsRouteAuthorized(true);
  }, [user, loading, pathname, router, isDevelopment, error]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If there's an auth error, show the error
  if (error && !isDevelopment) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-600 max-w-md p-6 bg-red-50 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p>{error.message}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If the route is valid for the user's auth state, render children
  if (isRouteAuthorized) {
    return <>{children}</>;
  }

  // This should rarely be reached, but it's a fallback while checking auth
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-lg">Checking authorization...</div>
    </div>
  );
}

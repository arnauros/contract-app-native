"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/auth-debug",
  "/test-flow",
  "/test-client-login",
];

// Debug routes that are always accessible in development mode
const devAccessibleRoutes = ["/dashboard", "/test-subscription"];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isDevelopment, error, loggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRouteAuthorized, setIsRouteAuthorized] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Debug logging
      console.log("⚡ ROUTE GUARD DEBUG ⚡");
      console.log("Current URL:", window.location.href);
      console.log("Current hostname:", window.location.hostname);
      console.log("Current pathname:", pathname);
      console.log("Auth state:", {
        user: user ? `${user.email} (${user.uid})` : null,
        loading,
        loggedIn,
        isDevelopment,
      });
      console.log("Public routes:", publicRoutes);
      console.log(
        "Is public route:",
        publicRoutes.some((route) =>
          (pathname || "").toLowerCase().startsWith(route.toLowerCase())
        )
      );
    }

    // Don't make auth decisions while still loading
    if (loading) {
      console.log("Auth still loading, deferring route guard decision");
      return;
    }

    // Mark that we've completed the authentication check
    setAuthCheckComplete(true);

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some((route) =>
      (pathname || "").toLowerCase().startsWith(route.toLowerCase())
    );

    // Check if the route should be accessible in development mode
    const isDevAccessibleRoute =
      isDevelopment &&
      devAccessibleRoutes.some((route) =>
        (pathname || "").toLowerCase().startsWith(route.toLowerCase())
      );

    // Always allow access to public routes
    if (isPublicRoute) {
      console.log("Public route - allowing access without auth check");
      setIsRouteAuthorized(true);
      return;
    }

    // In development mode, allow access to dev-accessible routes
    if (isDevAccessibleRoute) {
      console.log("Development mode - allowing access to:", pathname);
      setIsRouteAuthorized(true);
      return;
    }

    // For non-public routes, require authentication
    if (!user && !loggedIn) {
      console.log("Unauthorized access - redirecting to login");
      // Add the current path as the return URL
      const loginPath = `/login?returnUrl=${encodeURIComponent(
        pathname || "/"
      )}`;
      router.push(loginPath);
      return;
    }

    // If user is authenticated and trying to access login/signup, redirect to dashboard
    if (
      (user || loggedIn) &&
      (pathname === "/login" || pathname === "/signup")
    ) {
      console.log("Authenticated user on auth page - redirecting to dashboard");
      router.push("/dashboard");
      return;
    }

    console.log("Route authorized for authenticated user");
    setIsRouteAuthorized(true);
  }, [user, loading, pathname, router, isDevelopment, error, loggedIn]);

  // Show loading state while auth is being checked
  if (loading || !authCheckComplete) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If there's an auth error, show it (except in development mode)
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

  // If the route is authorized, render children
  if (isRouteAuthorized) {
    return <>{children}</>;
  }

  // This should rarely be reached, but it's a fallback
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-lg mb-2">Checking authorization...</p>
        <p className="text-sm text-gray-500">
          If you're not redirected soon,{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-blue-600 underline"
          >
            click here to log in
          </button>
        </p>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";

// Define public paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/subscribe",
  "/test-config",
  "/auth-debug", // Added debug path as public
  "/test-flow",
  "/test-client-login",
];

// Routes that should only be accessible on app.local
const SUBSCRIPTION_ROUTES = ["/subscription", "/billing"];

// Dashboard routes that require authentication - add all routes in (dashboard) route group
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/new",
  "/store",
  "/view",
  "/subscription",
  "/billing",
  "/Contracts/",
  "/settings",
];

// Define the Vercel deployment URL
const VERCEL_URL = "freelance-app-seven.vercel.app";
const VERCEL_PREVIEW_DOMAINS = [
  "freelance-app-seven.vercel.app",
  "freelance-1hwmap23a-arnaus-projects-0c4a8e0c.vercel.app",
  "freelance-drlupagt5-arnaus-projects-0c4a8e0c.vercel.app",
  "freelance-3v7mjzax1-arnaus-projects-0c4a8e0c.vercel.app",
  "freelance-38mahjevs-arnaus-projects-0c4a8e0c.vercel.app",
  "freelance-iiz4hu9sg-arnaus-projects-0c4a8e0c.vercel.app",
  "freelancenextjs.vercel.app",
];

// Helper function to create URLs while preserving the port
const createUrlWithPort = (path, requestUrl) => {
  const url = new URL(path, requestUrl);
  // Preserve the original port
  if (process.env.NODE_ENV === "development") {
    const originalUrl = new URL(requestUrl);
    if (originalUrl.port) {
      url.port = originalUrl.port;
    }
  }
  return url;
};

// Define public routes that don't require authentication
// const publicRoutes = ["/login", "/signup", "/"]; // Add root path as public

export function middleware(request) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const pathname = url.pathname;
  const isDevEnvironment = process.env.NODE_ENV === "development";

  // Debug logging
  console.log("🔍 MIDDLEWARE DEBUG 🔍");
  console.log("Request hostname:", hostname);
  console.log("Request pathname:", pathname);
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Full URL:", request.url);

  // Check if the hostname is app.local
  const isAppLocal =
    hostname === "app.local" ||
    hostname.includes("app.localhost") ||
    hostname === VERCEL_URL ||
    hostname.includes(VERCEL_URL) ||
    VERCEL_PREVIEW_DOMAINS.some((domain) => hostname.includes(domain));

  // Check if we're on localhost (for development)
  // Use includes() to be more permissive and catch port numbers
  const isLocalhost =
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname === "local";

  console.log("Is localhost detection:", {
    hostname,
    isLocalhost,
    isDevEnvironment,
    hostnameIncludes: hostname.includes("localhost"),
    ip: hostname.includes("127.0.0.1"),
  });

  // HANDLING APP SUBDOMAIN REDIRECTIONS
  // If we're on app.local or app.localhost and at the root path, redirect to dashboard
  if (isAppLocal && pathname === "/") {
    console.log("App subdomain at root path, redirecting to dashboard");
    return NextResponse.redirect(createUrlWithPort("/dashboard", request.url));
  }

  // First, check if the path is public - allow access without auth
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(path + "/"))
  ) {
    console.log("Public path detected, allowing access:", pathname);
    return NextResponse.next();
  }

  // Check for static assets and API routes - these are exempt from auth
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes("favicon.ico") ||
    pathname.startsWith("/assets/")
  ) {
    return NextResponse.next();
  }

  // In development mode, be more lenient
  if (isDevEnvironment && isLocalhost) {
    console.log(
      "Development environment detected, allowing access to:",
      pathname
    );
    return NextResponse.next();
  }

  // Check if path is protected (direct match or starts with any protected route)
  const isProtectedPath = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // For protected paths, we need to check authentication
  if (isProtectedPath) {
    const sessionCookie = request.cookies.get("session");

    // In development, we can bypass session checks for easier testing
    if (isDevEnvironment && isLocalhost) {
      console.log(
        "Development environment: bypassing auth for protected route:",
        pathname
      );
      return NextResponse.next();
    }

    if (!sessionCookie) {
      console.log("No session cookie found, redirecting to login.");
      // Add returnUrl to login for better UX
      const loginUrl = createUrlWithPort("/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If it's a subscription-related route, check if on app.local
    if (
      (pathname.startsWith("/subscription") ||
        pathname.startsWith("/billing")) &&
      !isAppLocal &&
      !isLocalhost
    ) {
      console.log(
        "Subscription route not on allowed host, redirecting to dashboard"
      );
      return NextResponse.redirect(
        createUrlWithPort("/dashboard", request.url)
      );
    }

    console.log(
      "Session cookie found, allowing access to protected route:",
      pathname
    );
    return NextResponse.next();
  }

  // ALL OTHER ROUTES REQUIRE AUTHENTICATION
  const sessionCookie = request.cookies.get("session");

  // No session cookie means redirect to login
  if (!sessionCookie && !isDevEnvironment) {
    console.log(
      "No session cookie found, redirecting to login for path:",
      pathname
    );
    // Add returnUrl to login for better UX
    const loginUrl = createUrlWithPort("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle subscription routes access restrictions
  if (
    SUBSCRIPTION_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) &&
    !isAppLocal &&
    !isLocalhost
  ) {
    console.log(
      "Subscription route not on allowed host, redirecting to dashboard"
    );
    return NextResponse.redirect(createUrlWithPort("/dashboard", request.url));
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

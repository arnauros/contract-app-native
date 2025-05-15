import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/utils";

// Define public paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/subscribe",
  "/view",
  "/public-view",
  "/test-access",
  "/contract-view",
  "/public-contract",
  "/minimal",
  "/pages/contract",
];

// Contract-related patterns that should always be accessible
const CONTRACT_PATTERNS = [
  "/view/",
  "/contract",
  "/contract-view/",
  "/public-view/",
  "/public-contract",
  "/no-auth/",
  "/minimal/",
  "/pages/contract/",
];

// Assets and API routes that should be accessible without auth
const ALWAYS_ACCESSIBLE = ["/_next/", "/api/", "/favicon.ico", "/assets/"];

// Routes that are always accessible to logged-in users regardless of subscription status
const UNPROTECTED_ROUTES = [
  "/dashboard/subscription-debug", // Subscription debug page should be accessible even after cancellation
  "/settings", // User settings should always be accessible
  "/profile", // Basic profile page should be accessible
];

// Routes that require a subscription
const PROTECTED_ROUTES = [
  "/dashboard", // Main dashboard requires subscription
  "/Contracts/", // All contract routes require subscription
  "/new", // Creating new content requires subscription
  "/store", // Store access requires subscription
];

/**
 * Create a URL for redirection while preserving the port in development
 */
const createUrlWithPort = (path: string, requestUrl: string): URL => {
  const url = new URL(path, requestUrl);

  if (env.isDevelopment) {
    const originalUrl = new URL(requestUrl);
    if (originalUrl.port) {
      url.port = originalUrl.port;
    }
  }

  return url;
};

// Check if a path is exempt from subscription protection
function isExemptFromSubscriptionProtection(pathname: string): boolean {
  return UNPROTECTED_ROUTES.some(
    (route) =>
      pathname === route || (route.endsWith("/") && pathname.startsWith(route))
  );
}

// Check if a path requires subscription
function requiresSubscription(pathname: string): boolean {
  // First check if it's explicitly exempt
  if (isExemptFromSubscriptionProtection(pathname)) {
    return false;
  }

  // Then check if it matches any protected route
  return PROTECTED_ROUTES.some(
    (route) =>
      pathname === route || (route.endsWith("/") && pathname.startsWith(route))
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = request.url;

  console.log(`\n\n🔍 MIDDLEWARE CHECK: ${pathname}`);
  console.log(`📌 URL: ${url}`);
  console.log(`💡 Request method: ${request.method}`);

  // First check: Always accessible paths (assets, API routes)
  if (ALWAYS_ACCESSIBLE.some((prefix) => pathname.startsWith(prefix))) {
    console.log(`✅ ALWAYS_ACCESSIBLE: ${pathname}`);
    return NextResponse.next();
  }

  // Second check: PUBLIC ACCESS - Contract view routes - always allow
  const isContractRoute = CONTRACT_PATTERNS.some(
    (pattern) => pathname.startsWith(pattern) || pathname.includes(pattern)
  );

  // More specific contract ID pattern check (e.g., /view/abc123)
  const contractIdPattern = /\/(view|contract-view|public-view)\/[a-zA-Z0-9]+/;
  const hasContractId = contractIdPattern.test(pathname);

  if (
    isContractRoute ||
    hasContractId ||
    pathname.includes("contract") ||
    pathname.includes("view")
  ) {
    console.log(`✅ CONTRACT ACCESS: Always allowing access to ${pathname}`);
    return NextResponse.next();
  }

  // Third check: Public paths - allow without auth
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isPublicPathWithSubPath = PUBLIC_PATHS.some((path) =>
    pathname.startsWith(`${path}/`)
  );

  if (isPublicPath || isPublicPathWithSubPath) {
    console.log(`✅ PUBLIC PATH: Allowing access to ${pathname}`);
    return NextResponse.next();
  }

  // For the subscription debug page, we need to make sure it's accessible
  // even if the subscription is canceled, so we skip any authentication checks
  if (pathname.startsWith("/dashboard/subscription-debug")) {
    // Allow accessing the subscription debug page regardless of subscription status
    // The RouteGuard will still handle basic authentication
    return NextResponse.next();
  }

  // For protected routes that require subscription, we'll let the client-side
  // SubscriptionGuard handle the check and redirection
  if (requiresSubscription(pathname)) {
    // The SubscriptionGuard in ClientApp.tsx will handle subscription checks
    return NextResponse.next();
  }

  // Auth check for protected routes
  const sessionCookie = request.cookies.get("session");
  console.log(`🔐 Auth check - Session cookie present: ${!!sessionCookie}`);

  // Redirect to login if no session cookie
  if (!sessionCookie) {
    console.log(`🔒 AUTH REQUIRED: Redirecting from ${pathname} to login`);
    const loginUrl = createUrlWithPort("/login", url);
    loginUrl.searchParams.set("returnUrl", pathname);
    console.log(`⬆️ REDIRECT URL: ${loginUrl.toString()}`);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow access
  console.log(`👤 AUTHENTICATED: Allowing access to ${pathname}`);
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g. /robots.txt)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};

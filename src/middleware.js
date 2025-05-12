import { NextResponse } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/about",
  "/reset-password",
  "/api/auth",
  "/api/stripe/webhooks",
  "/favicon.ico",
  "/api/health",
  "/test-admin",
  "/test-admin/*",
  "/test-client-login",
  "/auth-debug",
];

// Routes that require authentication but not subscription
const AUTH_ONLY_ROUTES = [
  "/subscribe",
  "/payment-success",
  "/payment-canceled",
  "/api/stripe/create-checkout",
  "/api/stripe/create-portal",
  "/test-subscription",
  "/test-client-login",
  "/auth-debug",
];

// Dashboard routes that require both authentication and subscription
const SUBSCRIPTION_REQUIRED_ROUTES = [
  "/dashboard",
  "/settings",
  "/profile",
  "/contracts",
  "/invoices",
  "/clients",
];

/**
 * Check if a path matches any of the patterns in the array
 */
function isPathInArray(path, array) {
  return array.some((route) => {
    if (route.endsWith("*")) {
      const baseRoute = route.slice(0, -1);
      return path.startsWith(baseRoute);
    }

    // Special handling for root path
    if (route === "/") {
      return path === "/";
    }

    return path === route || path.startsWith(`${route}/`);
  });
}

/**
 * Main middleware function
 */
export async function middleware(request) {
  // In development mode, use simplified middleware with no Firebase Admin
  // This is to avoid the node:stream issues in development
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const hostname = request.headers.get("host") || "";

  // Skip Next.js assets, API routes, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Allow public routes without any checks
  if (isPathInArray(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // Development-only: In development, just check for session cookie
  if (process.env.NODE_ENV === "development") {
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      const destination = `/login?from=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // Production-only code below this point
  // Get session cookie
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    // No session cookie found, redirect to login
    const destination = `/login?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // In production, we'd do real auth checks with Firebase Admin
  // But we've removed it from this middleware to avoid node:stream errors
  return NextResponse.next();
}

// Configure which paths this middleware runs on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

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

/**
 * Check if a path matches any of the patterns in the array
 */
function isPathInArray(path, array) {
  return array.some((route) => {
    if (route.endsWith("*")) {
      const baseRoute = route.slice(0, -1);
      return path.startsWith(baseRoute);
    }
    return path === route;
  });
}

export async function middleware(request) {
  // Get the pathname from the request
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Processing request for path: ${pathname}`);

  // Allow public routes without any checks
  if (isPathInArray(pathname, PUBLIC_ROUTES)) {
    console.log(
      `[Middleware] Path ${pathname} is in PUBLIC_ROUTES, allowing access`
    );
    return NextResponse.next();
  }

  // Skip Next.js assets, API routes, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/")
  ) {
    console.log(
      `[Middleware] Path ${pathname} is a system path, skipping auth check`
    );
    return NextResponse.next();
  }

  try {
    // Check if user is authenticated via session cookie
    const sessionCookie = request.cookies.get("session")?.value;
    const subscriptionStatus = request.cookies.get(
      "subscription_status"
    )?.value;

    console.log(
      `[Middleware] Session cookie found: ${sessionCookie ? "Yes" : "No"}`
    );
    console.log(
      `[Middleware] Subscription status: ${subscriptionStatus || "Not set"}`
    );

    // IMPORTANT: Check for inconsistent state - subscription cookie exists but session doesn't
    // This is likely a stale cookie that needs to be cleared
    if (!sessionCookie && subscriptionStatus) {
      console.log(
        `[Middleware] Inconsistent cookie state detected: subscription without session`
      );

      // Create response that clears subscription cookie and redirects to login
      const response = NextResponse.redirect(
        new URL(
          `/login?from=${encodeURIComponent(pathname)}&reset=true`,
          request.url
        )
      );

      // Clear the subscription cookie properly for the domain
      const host = request.headers.get("host") || "";
      const domain = host.includes("localhost") ? "localhost" : host;

      response.cookies.delete("subscription_status", {
        path: "/",
        domain: domain,
      });

      console.log(
        `[Middleware] Clearing stale subscription cookie and redirecting to login`
      );
      return response;
    }

    if (!sessionCookie) {
      // No session cookie found, redirect to login
      console.log(
        `[Middleware] No session cookie, redirecting to login from ${pathname}`
      );
      return redirectToLogin(request);
    }

    // For routes that only need authentication but not subscription, allow access
    // if the session cookie exists (we won't verify it here in the middleware)
    if (isPathInArray(pathname, AUTH_ONLY_ROUTES)) {
      console.log(
        `[Middleware] Path ${pathname} only needs auth, allowing access`
      );
      return NextResponse.next();
    }

    // Accept more subscription status values as valid
    if (
      subscriptionStatus === "active" ||
      subscriptionStatus === "trialing" ||
      subscriptionStatus === "none" || // For development
      subscriptionStatus === "trial" || // Alternative spelling
      subscriptionStatus === "canceled" || // Accept canceled for testing
      sessionCookie // Allow access with ANY session cookie for testing
    ) {
      console.log(
        `[Middleware] Subscription is valid (${
          subscriptionStatus || "session-only"
        }), allowing access`
      );
      return NextResponse.next();
    }

    // If user's subscription is canceled
    if (subscriptionStatus === "canceled") {
      console.log(
        `[Middleware] Subscription is canceled, redirecting to pricing with expired=true`
      );
      return NextResponse.redirect(
        new URL(
          `/pricing?expired=true&from=${encodeURIComponent(pathname)}`,
          request.url
        )
      );
    }

    // Otherwise, redirect to pricing page
    console.log(
      `[Middleware] No valid subscription, redirecting to pricing page`
    );
    return redirectToPricing(request);
  } catch (error) {
    console.error("[Middleware] Error in middleware:", error);
    // On error, redirect to login as a fallback
    return redirectToLogin(request);
  }
}

function redirectToLogin(request) {
  const destination = `/login?from=${encodeURIComponent(
    request.nextUrl.pathname
  )}`;
  console.log(`[Middleware] Redirecting to: ${destination}`);

  // Create the redirect response
  const response = NextResponse.redirect(new URL(destination, request.url));

  // Get host/domain from the request headers
  const host = request.headers.get("host") || "";
  const domain = host.includes("localhost") ? "localhost" : host;

  // If there's no session cookie but there's a subscription cookie, clear it
  const sessionCookie = request.cookies.get("session")?.value;
  const subscriptionStatus = request.cookies.get("subscription_status")?.value;

  if (!sessionCookie && subscriptionStatus) {
    console.log(
      `[Middleware] Clearing stale subscription cookie during redirect`
    );
    response.cookies.delete("subscription_status", {
      path: "/",
      domain: domain,
    });
  }

  return response;
}

function redirectToPricing(request) {
  const destination = `/pricing?required=true&from=${encodeURIComponent(
    request.nextUrl.pathname
  )}`;
  console.log(`[Middleware] Redirecting to: ${destination}`);
  return NextResponse.redirect(new URL(destination, request.url));
}

// Apply middleware to all routes except public files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static files)
     * 3. /public (public files)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (SEO files)
     */
    "/((?!_next|static|public|_vercel|favicon.ico|sitemap.xml).*)",
  ],
};

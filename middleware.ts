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

// Assets and API routes that should be accessible without auth
const ALWAYS_ACCESSIBLE = ["/_next/", "/api/", "/favicon.ico", "/assets/"];

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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = request.url;

  console.log(`\n\n🔍 MIDDLEWARE CHECK: ${pathname}`);

  // First check: Always accessible paths (assets, API routes)
  if (ALWAYS_ACCESSIBLE.some((prefix) => pathname.startsWith(prefix))) {
    console.log(`✅ ALWAYS_ACCESSIBLE: ${pathname}`);
    return NextResponse.next();
  }

  // Second check: Contract view routes - always allow
  if (
    pathname.startsWith("/view/") ||
    pathname.startsWith("/contract-view/") ||
    pathname.startsWith("/public-view/") ||
    pathname.startsWith("/no-auth/") ||
    pathname === "/public-contract" ||
    pathname.startsWith("/minimal/") ||
    pathname.startsWith("/pages/contract/")
  ) {
    console.log(`✅ CONTRACT VIEW PAGE: Allowing access to ${pathname}`);
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

  // Auth check for protected routes
  const sessionCookie = request.cookies.get("session");

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

// Define a custom matcher to exclude certain paths
export const config = {
  matcher: [
    // Match everything except _next, images and favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

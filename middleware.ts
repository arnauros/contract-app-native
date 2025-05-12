import { NextRequest, NextResponse } from "next/server";

// Define public paths that don't require authentication
const PUBLIC_PATHS = ["/", "/login", "/signup", "/pricing", "/subscribe"];

// Dashboard routes that require authentication
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

/**
 * Create a URL for redirection while preserving the port in development
 */
const createUrlWithPort = (path: string, requestUrl: string): URL => {
  const url = new URL(path, requestUrl);

  if (process.env.NODE_ENV === "development") {
    const originalUrl = new URL(requestUrl);
    if (originalUrl.port) {
      url.port = originalUrl.port;
    }
  }

  return url;
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`Middleware processing: ${pathname}`);

  // Allow access to static assets and API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes("favicon.ico") ||
    pathname.startsWith("/assets/")
  ) {
    console.log(`Allowing access to static/API path: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the path is public - allow access without auth
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(`${path}/`))
  ) {
    console.log(`Allowing access to public path: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the user is authenticated
  const sessionCookie = request.cookies.get("session");
  console.log(
    `Auth check for ${pathname}: Session cookie present: ${!!sessionCookie}`
  );

  // For protected routes without authentication, redirect to login
  if (!sessionCookie) {
    console.log(
      `No session cookie found, redirecting to login from: ${pathname}`
    );
    const loginUrl = createUrlWithPort("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow access
  console.log(`User authenticated, allowing access to: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

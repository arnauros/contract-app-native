import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/utils";

// Define public paths that don't require authentication
const PUBLIC_PATHS = ["/", "/login", "/signup", "/pricing", "/subscribe"];

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
  const hostname = request.headers.get("host") || "";

  // Allow access to static assets and API routes
  if (ALWAYS_ACCESSIBLE.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Check if the path is public - allow access without auth
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.next();
  }

  // Check if the user is authenticated
  const sessionCookie = request.cookies.get("session");

  // For protected routes without authentication, redirect to login
  if (!sessionCookie) {
    const loginUrl = createUrlWithPort("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

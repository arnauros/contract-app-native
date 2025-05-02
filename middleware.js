import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host");

  // Debug logging
  console.log("Middleware running for:", {
    hostname,
    pathname: url.pathname,
    fullUrl: request.url,
  });

  // Handle localhost case - never redirect
  if (hostname === "localhost:3000" || hostname === "localhost:3001") {
    console.log("Main domain (localhost) detected, allowing normal page load");
    return NextResponse.next();
  }

  // No forced redirect for app.localhost; RouteGuard will handle auth-based redirects

  // For all other cases, continue as normal
  console.log("Middleware allowing normal page load");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

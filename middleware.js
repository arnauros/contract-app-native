import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const pathname = url.pathname;

  // Debug logging
  console.log("🔍 MIDDLEWARE DEBUG 🔍");
  console.log("Request hostname:", hostname);
  console.log("Request pathname:", pathname);
  console.log("Full URL:", request.url);

  // Handle any localhost or IP variant - let client-side RouteGuard handle auth
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    console.log("Localhost domain detected, allowing normal page load");
    return NextResponse.next();
  }

  // For app.local domain, let the RouteGuard handle authentication-based redirects
  if (hostname.includes("app.local")) {
    console.log(
      "app.local domain detected, allowing RouteGuard to handle auth"
    );
    return NextResponse.next();
  }

  // For all other cases, continue as normal
  console.log("Middleware allowing normal page load");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

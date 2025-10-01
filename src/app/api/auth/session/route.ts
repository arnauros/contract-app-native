import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  console.log("Session API called");
  try {
    const { token } = await request.json();

    if (!token) {
      console.error("No token provided");
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    console.log("Token received, length:", token.length);

    // Verify the ID token
    try {
      console.log("Verifying token with Firebase Admin...");
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log("Token verified for user:", decodedToken.uid);

      // Create session cookie
      console.log("Creating session cookie...");
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await adminAuth.createSessionCookie(token, {
        expiresIn,
      });
      console.log("Session cookie created, length:", sessionCookie.length);

      // Set cookie
      const response = NextResponse.json({
        status: "success",
        userId: decodedToken.uid, // Return userId for verification
      });

      // Clear any existing session cookie first to prevent conflicts
      response.cookies.delete("session");

      response.cookies.set({
        name: "session",
        value: sessionCookie,
        maxAge: expiresIn / 1000, // Convert to seconds
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        // Don't set domain - let browser handle it correctly
      });

      console.log("Session created successfully for user:", decodedToken.uid);
      return response;
    } catch (error: any) {
      console.error("Token verification failed:", error);
      console.error("Error details:", error.code, error.message);
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error?.message || "Unknown error",
          code: error?.code,
        },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error?.message || "Unknown error",
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  console.log("DELETE session API called - clearing session cookie");
  const response = NextResponse.json({ status: "success" });

  // Properly delete the session cookie
  response.cookies.delete({
    name: "session",
    path: "/",
  });

  // Also set it to empty as a fallback
  response.cookies.set({
    name: "session",
    value: "",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  console.log("Session cookie cleared");
  return response;
}

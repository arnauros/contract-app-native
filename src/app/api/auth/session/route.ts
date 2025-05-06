import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      console.error("No token provided");
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    // Verify the ID token
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log("Token verified for user:", decodedToken.uid);

      // Create session cookie
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await adminAuth.createSessionCookie(token, {
        expiresIn,
      });

      // Set cookie
      const response = NextResponse.json({ status: "success" });
      response.cookies.set({
        name: "session",
        value: sessionCookie,
        maxAge: expiresIn / 1000, // Convert to seconds
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });

      console.log("Session created successfully for user:", decodedToken.uid);
      return response;
    } catch (error: any) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: error?.message || "Unknown error",
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
  const response = NextResponse.json({ status: "success" });
  response.cookies.set({
    name: "session",
    value: "",
    maxAge: 0, // Expire immediately
    path: "/",
  });
  return response;
}

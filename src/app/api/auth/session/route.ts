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
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log("Token verified:", decodedToken.uid);

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    // Set cookie
    cookies().set("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session", details: error.message },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  cookies().delete("session");
  return NextResponse.json({ status: "success" });
}

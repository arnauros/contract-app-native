import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

export async function GET(req: Request) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No session cookie found" },
        { status: 401 }
      );
    }

    // Verify the session cookie and get the user
    const auth = getAuth();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie);

    // Return the user ID
    return NextResponse.json({
      userId: decodedClaims.uid,
      email: decodedClaims.email,
      claims: decodedClaims,
    });
  } catch (error) {
    console.error("Error getting user ID:", error);
    return NextResponse.json(
      { error: "Failed to get user ID" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { initServerFirebase } from "@/lib/firebase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    const { auth } = initServerFirebase();

    try {
      // For security reasons, we can't directly sign in with email/password using the admin SDK
      // Instead, we'll simulate a "test login" by checking if the user exists

      try {
        // Try to get the user by email
        const userRecord = await auth.getUserByEmail(email);

        return NextResponse.json({
          success: true,
          message: "User exists and authentication system is working",
          user: {
            uid: userRecord.uid,
            email: userRecord.email,
          },
        });
      } catch (userError: any) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found or authentication failed",
            details: userError.message,
          },
          { status: 401 }
        );
      }
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: authError.message, code: authError.code },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error("Login test error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

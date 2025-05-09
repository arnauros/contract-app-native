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
    const { auth, db } = initServerFirebase();

    try {
      // Check if user already exists
      try {
        await auth.getUserByEmail(email);
        return NextResponse.json(
          {
            success: false,
            error: "User already exists",
          },
          { status: 400 }
        );
      } catch (userNotFoundError) {
        // This is expected if user doesn't exist
      }

      // Create the user
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: true,
      });

      // Add user to Firestore with default subscription
      await db
        .collection("users")
        .doc(userRecord.uid)
        .set({
          email: email,
          createdAt: new Date(),
          subscription: {
            status: "active",
            tier: "basic",
          },
        });

      return NextResponse.json({
        success: true,
        message: "Test user created successfully",
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
        },
      });
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: authError.message, code: authError.code },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Create test user error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

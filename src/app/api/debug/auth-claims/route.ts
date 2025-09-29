import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get the user and their custom claims
    const user = await adminAuth.getUser(userId);
    const customClaims = user.customClaims || {};

    // Return the user information and claims
    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      customClaims,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      },
    });
  } catch (error) {
    console.error("Error fetching user claims:", error);
    return NextResponse.json(
      { error: "Failed to fetch user claims" },
      { status: 500 }
    );
  }
}

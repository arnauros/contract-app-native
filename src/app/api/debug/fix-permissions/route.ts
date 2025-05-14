import { NextResponse } from "next/server";
import {
  resetUserClaims,
  checkUserPermissions,
} from "@/lib/firebase/firebaseAdmin.js";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fixing permissions for user: ${userId}`);

    // Check current permissions first
    const permissionCheck = await checkUserPermissions(userId);

    if (!permissionCheck.success) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 500 }
      );
    }

    // If claims already look valid but Firestore access doesn't work,
    // we need to reset the claims
    if (
      permissionCheck.hasValidClaims &&
      !permissionCheck.firestoreAccessWorks
    ) {
      console.log(
        "Valid claims found but Firestore access failing - resetting claims"
      );
    }

    // Reset claims to match database data
    const result = await resetUserClaims(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Check permissions again after reset
    const afterCheck = await checkUserPermissions(userId);

    return NextResponse.json({
      success: true,
      message: "Permissions fixed successfully",
      beforeFix: permissionCheck,
      afterFix: afterCheck,
      claimsReset: result,
    });
  } catch (error) {
    console.error("Error fixing permissions:", error);
    return NextResponse.json(
      { error: "Failed to fix permissions" },
      { status: 500 }
    );
  }
}

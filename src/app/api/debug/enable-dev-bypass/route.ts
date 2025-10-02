import { NextRequest, NextResponse } from "next/server";
import { getAuthInstance } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const auth = getAuthInstance();
    const db = getFirestore();

    // Set custom claims for admin access
    await auth.setCustomUserClaims(uid, {
      isAdmin: true,
      subscriptionStatus: "active",
      subscriptionTier: "pro"
    });

    // Set subscription_debug flag in user document
    await db.collection("users").doc(uid).update({
      subscription_debug: true,
      subscription: {
        status: "active",
        tier: "pro"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Dev bypass enabled for user",
      uid 
    });

  } catch (error) {
    console.error("Error enabling dev bypass:", error);
    return NextResponse.json(
      { error: "Failed to enable dev bypass" },
      { status: 500 }
    );
  }
}
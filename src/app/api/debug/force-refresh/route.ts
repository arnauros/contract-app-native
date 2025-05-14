import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

export async function POST(req: Request) {
  try {
    // Get current session cookie
    const cookieStore = cookies();

    // Delete session cookie
    cookieStore.delete("session");

    // Return success
    return NextResponse.json({
      success: true,
      message: "Session cookie cleared",
    });
  } catch (error) {
    console.error("Error forcing refresh:", error);
    return NextResponse.json(
      { error: "Failed to force refresh" },
      { status: 500 }
    );
  }
}

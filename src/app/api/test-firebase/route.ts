import { NextResponse } from "next/server";
import { initServerFirebase } from "@/lib/firebase/server";

export async function GET() {
  try {
    // Try initializing Firebase on the server
    const { auth, db } = initServerFirebase();

    return NextResponse.json({
      success: true,
      firebase: {
        serverAuth: !!auth,
        serverDb: !!db,
      },
      environmentVars: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not set",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
          ? "Set"
          : "Not set",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
          ? "Set"
          : "Not set",
        serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
          ? "Set"
          : "Not set",
      },
    });
  } catch (error: any) {
    console.error("Firebase test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

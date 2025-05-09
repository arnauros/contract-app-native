import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

export async function GET(req: Request) {
  try {
    // Get the user's session
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    // Check for authentication
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.substring(7);
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        console.error("Token verification failed:", error);
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      // For testing, attempt to get user from cookies
      const cookies = req.headers.get("cookie");
      if (cookies) {
        const sessionCookie = cookies
          .split("; ")
          .find((cookie) => cookie.startsWith("session="));

        if (sessionCookie) {
          try {
            const idToken = sessionCookie.split("=")[1];
            const decodedToken = await getAuth().verifySessionCookie(idToken);
            userId = decodedToken.uid;
          } catch (error) {
            console.error("Session cookie verification failed:", error);
          }
        }
      }
    }

    // If no user was found by any method
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check subscription status
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    // Determine if user has access
    const hasAccess =
      subscription?.status === "active" || subscription?.status === "trialing";

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Subscription required",
          currentStatus: subscription?.status || "none",
          message: "You need an active subscription to access this content.",
        },
        { status: 403 }
      );
    }

    // Return protected content
    return NextResponse.json({
      message: "You have successfully accessed protected content!",
      userData: {
        tier: subscription.tier,
        status: subscription.status,
        expiresAt: subscription.currentPeriodEnd,
      },
      protectedData: {
        secretMessage:
          "This is premium content only visible to paid subscribers.",
        features: [
          "Advanced Analytics",
          "Priority Support",
          "Custom Branding",
          "API Access",
        ],
      },
    });
  } catch (error) {
    console.error("Error in protected-content API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

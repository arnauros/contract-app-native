import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(req: Request) {
  try {
    // Check if domain is app.local or localhost in development
    const hostname = req.headers.get("host") || "";
    const isLocalhost =
      hostname.includes("localhost") || hostname.includes("127.0.0.1");
    const isAppLocal = hostname === "app.local";
    const isDev = process.env.NODE_ENV === "development";

    // Allow on app.local OR localhost during development
    const isAllowedHost = isAppLocal || (isDev && isLocalhost);

    // Only allow this API to be called from allowed hosts
    if (!isAllowedHost) {
      return NextResponse.json(
        {
          error:
            "This API is only available on app.local or localhost in development",
        },
        { status: 403 }
      );
    }

    const { userId } = await req.json();

    // Get user's Stripe customer ID from Firestore
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 }
      );
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

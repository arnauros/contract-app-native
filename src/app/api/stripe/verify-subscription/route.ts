import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@/lib/stripe/config";

// Initialize Firebase Admin
initAdmin();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user document from Firestore
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;
    let stripeCustomerId = userData?.stripeCustomerId;

    // First check: subscription data in user document
    let isActive = false;

    if (subscription) {
      isActive =
        subscription?.status === "active" ||
        subscription?.status === "trialing";
    } else {
    }

    // If not active but has a Stripe customer ID, check directly with Stripe as a fallback
    if (!isActive && stripeCustomerId) {
      try {
        // Retrieve all subscriptions for the customer
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "active", // Only get active subscriptions
          limit: 1,
        });

        // If any active subscriptions exist
        if (subscriptions.data.length > 0) {
          const activeSubscription = subscriptions.data[0] as any; // Cast to any to access properties
          isActive = true;

          // Update the user's document with this subscription data - ensure no undefined values
          const subscriptionData = {
            subscriptionId: activeSubscription.id,
            status: activeSubscription.status,
            customerId: stripeCustomerId,
            tier: "pro",
            currentPeriodEnd: activeSubscription.current_period_end || null,
            cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
          };

          // Update the user document
          await db.collection("users").doc(userId).update({
            subscription: subscriptionData,
            updatedAt: new Date(),
          });
        } else {
        }
      } catch (stripeError) {
        console.error("Error checking subscription with Stripe:", stripeError);
      }
    } else if (!stripeCustomerId) {
    }

    // Create response with the verification results
    const responseData = {
      userId,
      hasSubscription: !!subscription,
      isActive,
      subscriptionStatus: subscription?.status || "none",
      subscriptionId: subscription?.subscriptionId || null,
      subscriptionTier: subscription?.tier || null,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      wasUpdatedFromStripe:
        isActive && (!subscription || subscription.status !== "active"),
    };

    // Set the correct subscription status in the cookie
    const response = NextResponse.json(responseData);

    // Set subscription cookie based on the verified status
    // Use 'active' if isActive is true, regardless of what's in the subscription.status field
    // This ensures the cookie is updated properly when a user cancels and resubscribes
    const cookieValue = isActive ? "active" : subscription?.status || "none";

    response.cookies.set("subscription_status", cookieValue, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return NextResponse.json(
      { error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}

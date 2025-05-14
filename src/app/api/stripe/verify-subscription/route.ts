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

    console.log(`Verifying subscription for user: ${userId}`);

    // Get user document from Firestore
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;
    let stripeCustomerId = userData?.stripeCustomerId;

    console.log(`User document data:`, {
      userId,
      hasStripeCustomerId: !!stripeCustomerId,
      hasSubscription: !!subscription,
      subscriptionStatus: subscription?.status,
      subscriptionId: subscription?.subscriptionId,
    });

    // First check: subscription data in user document
    let isActive = false;

    if (subscription) {
      isActive =
        subscription?.status === "active" ||
        subscription?.status === "trialing";
      console.log(
        `Subscription status from Firestore: ${subscription.status}, isActive: ${isActive}`
      );
    }

    // If not active but has a Stripe customer ID, check directly with Stripe as a fallback
    if (!isActive && stripeCustomerId) {
      console.log(
        `Subscription not active in Firestore, checking with Stripe directly`
      );
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

          console.log(`Found active subscription in Stripe:`, {
            subscriptionId: activeSubscription.id,
            status: activeSubscription.status,
          });

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

          console.log(
            `Updated user document with subscription data from Stripe`
          );
        } else {
          console.log(
            `No active subscriptions found in Stripe for customer: ${stripeCustomerId}`
          );
        }
      } catch (stripeError) {
        console.error(`Error checking subscription with Stripe:`, stripeError);
      }
    } else if (!stripeCustomerId) {
      console.log(`User has no Stripe customer ID, cannot check with Stripe`);
    }

    return NextResponse.json({
      userId,
      hasSubscription: !!subscription,
      isActive,
      subscriptionStatus: subscription?.status || "none",
      subscriptionId: subscription?.subscriptionId || null,
      subscriptionTier: subscription?.tier || null,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      wasUpdatedFromStripe:
        isActive && (!subscription || subscription.status !== "active"),
    });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return NextResponse.json(
      { error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}

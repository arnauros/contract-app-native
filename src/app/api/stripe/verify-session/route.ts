import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase/admin";
import { STRIPE_API_VERSION } from "@/lib/stripe/config";

// Initialize Firebase Admin
initAdmin();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log(`Verifying session ${sessionId}`);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "subscription", "customer"],
    });

    // Check if the session was paid
    const isPaid = session.payment_status === "paid";

    // For subscriptions, also check if the subscription is active
    let isSubscriptionActive = false;
    let subscriptionObject: any = null;
    let userId = session.metadata?.userId || session.metadata?.firebaseUID;

    if (session.subscription) {
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

      subscriptionObject =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : session.subscription;

      isSubscriptionActive = ["active", "trialing"].includes(
        subscriptionObject.status
      );

      console.log(`Subscription from session:`, {
        subscriptionId,
        status: subscriptionObject.status,
        isActive: isSubscriptionActive,
      });
    }

    // Get userId from session metadata or by looking up the customer in Firestore
    if (!userId && session.customer) {
      // Try to find the user by Stripe customer ID
      const db = getFirestore();
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer.id;

      console.log(`Looking up user by customer ID: ${customerId}`);

      const usersRef = db.collection("users");
      const snapshot = await usersRef
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        userId = snapshot.docs[0].id;
        console.log(`Found user ${userId} for customer ${customerId}`);
      }
    }

    // If we have a valid subscription and user, update the user's subscription status
    let subscriptionUpdated = false;

    if (isSubscriptionActive && userId && subscriptionObject) {
      try {
        const db = getFirestore();
        const auth = getAuth();

        // Get the current user data
        const userDoc = await db.collection("users").doc(userId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentSub = userData?.subscription;

          // Check if the subscription needs updating
          const needsUpdate =
            !currentSub ||
            currentSub.status !== subscriptionObject.status ||
            currentSub.subscriptionId !== subscriptionObject.id;

          if (needsUpdate) {
            console.log(
              `Updating subscription for user ${userId} from verify-session`
            );

            // Format subscription data - ensure no undefined values
            const subscriptionData = {
              subscriptionId: subscriptionObject.id,
              status: subscriptionObject.status,
              customerId:
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id || "unknown",
              tier: "pro",
              currentPeriodEnd: subscriptionObject.current_period_end || null,
              cancelAtPeriodEnd:
                subscriptionObject.cancel_at_period_end || false,
            };

            // Update the user document
            await db.collection("users").doc(userId).update({
              subscription: subscriptionData,
              updatedAt: new Date(),
            });

            // Get existing claims first
            const userRecord = await auth.getUser(userId);
            const existingClaims = userRecord.customClaims || {};

            console.log(`Current custom claims:`, existingClaims);

            // Prepare the new claims object, keeping all existing claims
            const newClaims = {
              ...existingClaims,
              subscriptionStatus: subscriptionObject.status,
              subscriptionTier: "pro",
              subscriptionId: subscriptionObject.id,
            };

            // Log the claims we're about to set
            console.log(`Setting custom claims:`, newClaims);

            // Update custom claims, preserving existing ones
            await auth.setCustomUserClaims(userId, newClaims);

            console.log(
              `✅ User ${userId} subscription updated from verify-session`
            );
            subscriptionUpdated = true;
          }
        }
      } catch (error) {
        console.error(`Error updating user subscription:`, error);
      }
    }

    // Log the verification details
    console.log(`Verification result for session ${sessionId}:`, {
      paymentStatus: session.payment_status,
      isPaid,
      isSubscriptionActive,
      customerId: session.customer,
      userId: userId || "unknown",
      subscriptionUpdated,
    });

    // Return the verification result
    return NextResponse.json({
      verified: isPaid,
      isSubscriptionActive,
      sessionId,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      mode: session.mode,
      userId,
      subscriptionUpdated,
    });
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    return NextResponse.json(
      { error: "Failed to verify checkout session" },
      { status: 500 }
    );
  }
}

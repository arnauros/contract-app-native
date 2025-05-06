import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { UserSubscription } from "@/lib/stripe/config";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// Webhook secret from environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper to extract subscription data safely
const getSubscriptionData = (subscription: any): UserSubscription => {
  const tier = "pro"; // Currently we only have one tier beyond free

  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status as UserSubscription["status"],
    tier,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log(`Webhook received: ${event.type}`);

    const db = getFirestore();
    const auth = getAuth();

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get user from Firestore using customer ID
        const userQuery = await db
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.error("No user found for customer:", customerId);
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;

        // Extract subscription data
        const subscriptionData = getSubscriptionData(subscription);

        // Additional data we might want to update
        const updateData: Record<string, any> = {
          subscription: subscriptionData,
          updatedAt: new Date(),
        };

        // Update subscription data in Firestore
        await db.collection("users").doc(userId).update(updateData);

        // Update custom claims for access control
        const customClaims = {
          subscriptionStatus: subscription.status,
          subscriptionTier: "pro",
          stripeCustomerId: customerId,
          subscriptionId: subscription.id,
        };

        await auth.setCustomUserClaims(userId, customClaims);

        console.log(
          `Updated subscription for user ${userId} to ${subscription.status}`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get user from Firestore using customer ID
        const userQuery = await db
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.error("No user found for customer:", customerId);
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;

        // Update subscription status to canceled
        const subscriptionData = {
          ...getSubscriptionData(subscription),
          status: "canceled",
        };

        await db.collection("users").doc(userId).update({
          subscription: subscriptionData,
          updatedAt: new Date(),
        });

        // Update custom claims to remove pro status
        await auth.setCustomUserClaims(userId, {
          subscriptionStatus: "canceled",
          subscriptionTier: "free",
        });

        console.log(`Canceled subscription for user ${userId}`);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error("No userId in session metadata");
          return NextResponse.json(
            { error: "No userId in session metadata" },
            { status: 400 }
          );
        }

        // Only process subscription checkouts
        if (session.mode !== "subscription") {
          console.log("Ignoring non-subscription checkout session");
          break;
        }

        // Get the subscription that was created
        if (!session.subscription) {
          console.error("No subscription in session");
          break;
        }

        // Update user's subscription status
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const subscriptionData = getSubscriptionData(subscription);

        await db.collection("users").doc(userId).update({
          subscription: subscriptionData,
          checkoutCompleted: true,
          updatedAt: new Date(),
        });

        // Update custom claims
        await auth.setCustomUserClaims(userId, {
          subscriptionStatus: subscription.status,
          subscriptionTier: "pro",
          stripeCustomerId: session.customer as string,
          subscriptionId: subscription.id,
        });

        console.log(`Completed checkout for user ${userId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any; // Use any for initial cast to access properties safely
        const customerId = invoice.customer as string;

        // The subscription property can be a string or null according to Stripe API
        // First check if it exists at all, then ensure it's a string
        const subscriptionId = invoice.subscription
          ? typeof invoice.subscription === "string"
            ? invoice.subscription
            : null
          : null;

        if (!subscriptionId) {
          console.log(
            "Invoice not related to a subscription or subscription ID is invalid"
          );
          break;
        }

        // Get user from customer ID
        const userQuery = await db
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.log("No user found for customer:", customerId);
          break;
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        // Only update if this is for the current subscription
        if (userData?.subscription?.subscriptionId === subscriptionId) {
          // Get the latest subscription data
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          const subscriptionData = getSubscriptionData(subscription);

          // Update subscription data in Firestore
          await db
            .collection("users")
            .doc(userDoc.id)
            .update({
              subscription: subscriptionData,
              lastInvoice: {
                id: invoice.id,
                amount: invoice.amount_paid,
                date: new Date(invoice.created * 1000),
                receipt: invoice.receipt_url || null, // Safely access with fallback
              },
              updatedAt: new Date(),
            });

          console.log(`Updated payment info for user ${userDoc.id}`);
        } else {
          console.log(
            `Invoice subscription ID doesn't match user's current subscription`
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any; // Use any for initial cast to access properties safely
        const customerId = invoice.customer as string;

        // Same careful handling of the subscription property as above
        const subscriptionId = invoice.subscription
          ? typeof invoice.subscription === "string"
            ? invoice.subscription
            : null
          : null;

        if (!subscriptionId) {
          console.log(
            "Invoice not related to a subscription or subscription ID is invalid"
          );
          break;
        }

        // Get user from customer ID
        const userQuery = await db
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.log("No user found for customer:", customerId);
          break;
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        if (userData?.subscription?.subscriptionId === subscriptionId) {
          // Update the user's payment failure status
          await db
            .collection("users")
            .doc(userDoc.id)
            .update({
              "subscription.paymentFailed": true,
              "subscription.lastPaymentFailure": {
                invoiceId: invoice.id,
                date: new Date(invoice.created * 1000),
                attempt: invoice.attempt_count,
              },
              updatedAt: new Date(),
            });

          console.log(`Payment failed for user ${userDoc.id}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { UserSubscription } from "@/lib/stripe/config";
import { cookies } from "next/headers";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Webhook secret from environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to set subscription cookie
const createResponseWithCookie = (data: any, subscriptionStatus: string) => {
  const response = NextResponse.json(data);

  // Set the cookie in the response headers
  response.cookies.set("subscription_status", subscriptionStatus, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
};

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
      console.log("Verifying webhook signature...");

      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured!");
        return NextResponse.json(
          { error: "Webhook secret is not configured" },
          { status: 500 }
        );
      }

      if (!signature) {
        console.error("No Stripe signature found in request headers");
        return NextResponse.json(
          { error: "No Stripe signature found" },
          { status: 400 }
        );
      }

      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("Webhook signature verified successfully");
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        {
          error: "Webhook signature verification failed",
          details: (err as Error).message,
        },
        { status: 400 }
      );
    }

    console.log(`Webhook received: ${event.type}`, {
      eventId: event.id,
      created: new Date(event.created * 1000).toISOString(),
    });

    // Initialize Firebase Admin
    const firebaseInitialized = initAdmin();
    if (!firebaseInitialized) {
      console.error(
        "Firebase Admin not initialized - webhook cannot process events"
      );
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    const db = getFirestore();
    const auth = getAuth();

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`Processing subscription event ${event.type}:`, {
          subscriptionId: subscription.id,
          customerId,
          status: subscription.status,
        });

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

        console.log(
          `Updating subscription for user ${userId}:`,
          subscriptionData
        );

        // Update subscription data in Firestore
        await db.collection("users").doc(userId).update(updateData);

        // Log the update confirmation
        console.log(`Successfully updated subscription for user ${userId}`);

        // Return response with cookie
        return createResponseWithCookie(
          { received: true, status: subscription.status },
          subscription.status
        );
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

        // Get existing claims first
        const userRecord = await auth.getUser(userId);
        const existingClaims = userRecord.customClaims || {};

        // Update custom claims to remove pro status but preserve other claims
        await auth.setCustomUserClaims(userId, {
          ...existingClaims,
          subscriptionStatus: "canceled",
          subscriptionTier: "free",
        });

        console.log(`Canceled subscription for user ${userId}`);

        // Return response with canceled cookie
        return createResponseWithCookie(
          { received: true, status: "canceled" },
          "canceled"
        );
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.metadata?.userId || session.metadata?.firebaseUID;

        console.log(`Processing checkout.session.completed event:`, {
          sessionId: session.id,
          userId,
          customerId: session.customer,
          hasSubscription: !!session.subscription,
          mode: session.mode,
          metadata: session.metadata,
        });

        if (!userId) {
          console.error("No userId in session metadata", {
            metadata: session.metadata,
            sessionId: session.id,
          });
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
          console.error("No subscription in session", {
            sessionId: session.id,
          });
          break;
        }

        // Track subscription data at the outer scope
        let subscriptionData: UserSubscription | null = null;

        // Update user's subscription status
        try {
          console.log(`Retrieving subscription: ${session.subscription}`);
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          console.log(`Subscription retrieved:`, {
            subscriptionId: subscription.id,
            status: subscription.status,
            customerId: subscription.customer,
          });

          subscriptionData = getSubscriptionData(subscription);
          console.log(
            `Updating user ${userId} subscription in Firestore:`,
            subscriptionData
          );

          // Get the user document first to verify it exists
          const userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists) {
            console.error(`User document not found for ID: ${userId}`);
            return NextResponse.json(
              { error: "User not found" },
              { status: 404 }
            );
          }

          // Update the user document with subscription data
          await db.collection("users").doc(userId).update({
            subscription: subscriptionData,
            checkoutCompleted: true,
            updatedAt: new Date(),
          });
          console.log(
            `✅ Successfully updated user ${userId} with subscription data`
          );

          // Update custom claims
          try {
            // Get existing claims first
            const userRecord = await auth.getUser(userId);
            const existingClaims = userRecord.customClaims || {};

            // Update custom claims, preserving existing ones
            await auth.setCustomUserClaims(userId, {
              ...existingClaims,
              subscriptionStatus: subscription.status,
              subscriptionTier: "pro",
              stripeCustomerId: session.customer as string,
              subscriptionId: subscription.id,
            });
            console.log(`✅ Successfully updated user ${userId} custom claims`);
          } catch (claimsError) {
            console.error(
              `Failed to update custom claims for user ${userId}:`,
              claimsError
            );
          }

          // Double-check that the subscription was properly stored
          const updatedUser = await db.collection("users").doc(userId).get();
          const updatedData = updatedUser.data();
          console.log(`User after update:`, {
            hasSubscription: !!updatedData?.subscription,
            subscriptionStatus: updatedData?.subscription?.status,
            isActive:
              updatedData?.subscription?.status === "active" ||
              updatedData?.subscription?.status === "trialing",
          });

          console.log(`Completed checkout for user ${userId}`);

          if (subscriptionData) {
            // Create session cookie for the user to allow dashboard access
            try {
              // Get user's ID token to create session cookie
              const userRecord = await auth.getUser(userId);
              console.log(`Creating session cookie for user ${userId}`);

              // Note: We can't create a session cookie from webhook context
              // The user needs to be authenticated on the client side
              // This will be handled by the payment success page
            } catch (sessionError) {
              console.error(
                `Failed to create session cookie for user ${userId}:`,
                sessionError
              );
            }

            // Return response with cookie
            return createResponseWithCookie(
              { received: true, status: subscriptionData.status },
              subscriptionData.status
            );
          }
        } catch (subError) {
          console.error(
            `Error processing subscription for checkout.session.completed:`,
            subError
          );
          // If we failed to retrieve or process the subscription, return error
          return NextResponse.json(
            { error: "Failed to process subscription" },
            { status: 500 }
          );
        }

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
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
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

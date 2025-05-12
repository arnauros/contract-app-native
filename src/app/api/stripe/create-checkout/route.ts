import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// Track active checkout sessions to prevent duplicates
const ACTIVE_CHECKOUTS = new Set<string>();

export async function POST(req: Request) {
  try {
    // Check hostname with better detection for local development
    const hostname = req.headers.get("host") || "";
    console.log("Request hostname:", hostname);

    const isDev = process.env.NODE_ENV === "development";

    // More comprehensive local development hostname detection
    const isLocalDevelopment =
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      (isDev && hostname.match(/localhost:\d+/));

    // In development, allow all hostnames
    if (!isLocalDevelopment && !isDev) {
      return NextResponse.json(
        {
          error:
            "This API is only available in development or on approved domains",
          hostname,
        },
        { status: 403 }
      );
    }

    const { userId, priceId, successUrl, cancelUrl, checkoutId } =
      await req.json();

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Check for duplicate checkout requests
    const requestId = checkoutId || `${userId}_${priceId}_${Date.now()}`;
    if (ACTIVE_CHECKOUTS.has(requestId)) {
      console.log(`Duplicate checkout detected: ${requestId}`);
      return NextResponse.json(
        { error: "A checkout is already in progress" },
        { status: 409 }
      );
    }

    // Add to active checkouts
    ACTIVE_CHECKOUTS.add(requestId);

    // Set a timeout to remove from active checkouts after 5 minutes
    setTimeout(() => {
      ACTIVE_CHECKOUTS.delete(requestId);
    }, 5 * 60 * 1000);

    console.log(
      `Creating checkout session for user: ${userId}, price: ${priceId}, checkout ID: ${requestId}`
    );

    // Get user from Firestore
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    // Create or get a Stripe customer
    let customerId = userData?.stripeCustomerId;
    if (!customerId) {
      // User doesn't have a Stripe customer ID yet, create one
      console.log(`No Stripe customer found for user ${userId}, creating one`);
      const userRecord = await db.collection("users").doc(userId).get();
      const email = userRecord.data()?.email || null;

      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: userId,
        },
      });

      customerId = customer.id;

      // Store the customer ID in Firestore
      await db
        .collection("users")
        .doc(userId)
        .update({
          stripeCustomerId: customerId,
        })
        .catch((error) => {
          console.error("Error updating user with Stripe customer ID:", error);
        });
    }

    // Track the checkout in Firestore to prevent duplicates
    await db.collection("stripe_checkouts").doc(requestId).set({
      userId,
      priceId,
      timestamp: new Date(),
      status: "pending",
      customerId,
    });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&checkout_id=${requestId}`,
      cancel_url:
        cancelUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout_canceled=true&checkout_id=${requestId}`,
      metadata: {
        firebaseUID: userId,
        checkoutId: requestId,
        timestamp: Date.now().toString(),
      },
    });

    // Update the checkout record with the session ID
    await db.collection("stripe_checkouts").doc(requestId).update({
      sessionId: session.id,
      sessionCreatedAt: new Date(),
      status: "created",
    });

    // Return the session ID and URL
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      checkoutId: requestId,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

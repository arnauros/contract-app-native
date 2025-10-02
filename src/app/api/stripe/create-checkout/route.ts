import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initAdmin();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
  // Add better Stripe configuration
  typescript: true,
  timeout: 20000, // 20 second timeout
  maxNetworkRetries: 3, // Retry API calls up to 3 times
});

// Track active checkout sessions to prevent duplicates
const ACTIVE_CHECKOUTS = new Set<string>();

export async function POST(req: Request) {
  try {
    // Validate content type is application/json
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content type must be application/json" },
        { status: 415 }
      );
    }

    // Check hostname with better detection for local development
    const hostname = req.headers.get("host") || "";
    console.log("Request hostname:", hostname);

    const isDev = process.env.NODE_ENV === "development";

    // More comprehensive local development hostname detection
    const isLocalDevelopment =
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      hostname.includes("vercel.app") ||
      (isDev && hostname.match(/localhost:\d+/));

    // Allow localhost, vercel.app domains, and development
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

    // Parse request JSON with explicit error handling
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const {
      userId,
      priceId,
      successUrl,
      cancelUrl,
      checkoutId,
      promotionCodeId,
    } = requestData;

    // Validate required parameters more thoroughly
    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing required parameter: priceId" },
        { status: 400 }
      );
    }

    // Validate price ID format to prevent injection attacks
    if (typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return NextResponse.json(
        { error: "Invalid Stripe price ID format" },
        { status: 400 }
      );
    }

    // Validate userId format (basic check)
    if (typeof userId !== "string" || userId.length < 5) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
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
    setTimeout(
      () => {
        ACTIVE_CHECKOUTS.delete(requestId);
      },
      5 * 60 * 1000
    );

    console.log(
      `Creating checkout session for user: ${userId}, price: ${priceId}, checkout ID: ${requestId}`
    );

    // IMPORTANT: Log the exact price ID to make sure it's correct
    console.log("Received price ID:", priceId);

    // Get user from Firestore
    const db = getFirestore();

    try {
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        console.error(`User document not found for ID: ${userId}`);
        ACTIVE_CHECKOUTS.delete(requestId);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userData = userDoc.data();

      // Create or get a Stripe customer
      let customerId = userData?.stripeCustomerId;
      if (!customerId) {
        // User doesn't have a Stripe customer ID yet, create one
        console.log(
          `No Stripe customer found for user ${userId}, creating one`
        );
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
            console.error(
              "Error updating user with Stripe customer ID:",
              error
            );
          });
      } else {
        // Verify that the customer exists in Stripe
        try {
          await stripe.customers.retrieve(customerId);
          console.log(`Verified existing Stripe customer: ${customerId}`);
        } catch (error: any) {
          // If customer doesn't exist in Stripe, create a new one
          if (error.code === "resource_missing") {
            console.log(
              `Customer ${customerId} doesn't exist in Stripe, creating new one`
            );
            const userRecord = await db.collection("users").doc(userId).get();
            const email = userRecord.data()?.email || null;

            const customer = await stripe.customers.create({
              email: email,
              metadata: {
                firebaseUID: userId,
              },
            });

            customerId = customer.id;

            // Update the customer ID in Firestore
            await db
              .collection("users")
              .doc(userId)
              .update({
                stripeCustomerId: customerId,
              })
              .catch((updateError) => {
                console.error(
                  "Error updating user with new Stripe customer ID:",
                  updateError
                );
              });
          } else {
            // For other errors, rethrow
            throw error;
          }
        }
      }

      // Track the checkout in Firestore to prevent duplicates
      await db.collection("stripe_checkouts").doc(requestId).set({
        userId,
        priceId,
        timestamp: new Date(),
        status: "pending",
        customerId,
      });

      try {
        // Check if the price exists in Stripe before creating the session
        try {
          await stripe.prices.retrieve(priceId);
        } catch (priceError: any) {
          console.error(`Invalid price ID: ${priceId}`, priceError);
          ACTIVE_CHECKOUTS.delete(requestId);

          await db
            .collection("stripe_checkouts")
            .doc(requestId)
            .update({
              status: "failed",
              errorMessage: `Invalid price ID: ${priceId}`,
              errorCode: priceError.code,
              errorType: priceError.type,
              failedAt: new Date(),
            });

          return NextResponse.json(
            { error: `Invalid price ID: ${priceId}` },
            { status: 400 }
          );
        }

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
            `${
              process.env.NEXT_PUBLIC_APP_URL
            }/payment-success?session_id={CHECKOUT_SESSION_ID}&checkout_id=${requestId}&t=${Date.now()}`,
          cancel_url:
            cancelUrl ||
            `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout_canceled=true&checkout_id=${requestId}`,
          metadata: {
            firebaseUID: userId,
            checkoutId: requestId,
            timestamp: Date.now().toString(),
          },
          allow_promotion_codes: promotionCodeId ? false : true,
          ...(promotionCodeId && {
            discounts: [
              {
                promotion_code: promotionCodeId,
              },
            ],
          }),
        });

        console.log("Checkout session created:", {
          sessionId: session.id,
          success_url: session.success_url,
          customerId,
          userId,
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
      } catch (stripeError: any) {
        // Log the detailed Stripe error
        console.error("Stripe error creating checkout session:", {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
          param: stripeError.param,
          detail: stripeError.detail,
        });

        // Update checkout status in Firestore
        await db
          .collection("stripe_checkouts")
          .doc(requestId)
          .update({
            status: "failed",
            errorMessage: stripeError.message,
            errorCode: stripeError.code,
            errorType: stripeError.type,
            failedAt: new Date(),
          })
          .catch((err) =>
            console.error("Failed to update checkout status:", err)
          );

        // Remove from active checkouts
        ACTIVE_CHECKOUTS.delete(requestId);

        // Return a more specific error
        return NextResponse.json(
          {
            error: stripeError.message || "Stripe checkout creation failed",
            code: stripeError.code,
            type: stripeError.type,
          },
          { status: 400 }
        );
      }
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      ACTIVE_CHECKOUTS.delete(requestId);

      return NextResponse.json(
        { error: "Database operation failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Unexpected error in checkout API:", error);

    // Remove from active checkout set if request ID is available
    try {
      const { userId, priceId, checkoutId } = await req.json();
      if (userId && priceId) {
        const requestId = checkoutId || `${userId}_${priceId}_${Date.now()}`;
        ACTIVE_CHECKOUTS.delete(requestId);
      }
    } catch (e) {
      // Ignore errors in cleanup
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

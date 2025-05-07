import { buffer } from "micro";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../../../lib/firebase/admin";

// Initialize Firebase Admin if not already initialized
initAdmin();
const db = getFirestore();

export const config = {
  api: {
    bodyParser: false, // Required for Stripe webhook verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      await buffer(req),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case "charge.failed":
        await handleChargeFailed(event.data.object);
        break;
      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object);
        break;
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.created":
        await handleCustomerCreated(event.data.object);
        break;
      case "customer.deleted":
        await handleCustomerDeleted(event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.updated":
        await handleCustomerUpdated(event.data.object);
        break;
      case "invoice.created":
        await handleInvoiceCreated(event.data.object);
        break;
      case "invoice.overdue":
        await handleInvoiceOverdue(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.status(200).json({ received: true });
}

// Event handlers
async function handleChargeFailed(charge) {
  console.log("Charge failed:", charge);
  // Update user payment status in Firebase
  if (charge.customer) {
    await updateUserPaymentStatus(charge.customer, "failed", charge);
  }
}

async function handleChargeSucceeded(charge) {
  console.log("Charge succeeded:", charge);
  // Update user payment status in Firebase
  if (charge.customer) {
    await updateUserPaymentStatus(charge.customer, "succeeded", charge);
  }
}

async function handleCheckoutSessionCompleted(session) {
  console.log("Checkout complete:", session);

  if (session.customer && session.client_reference_id) {
    // The client_reference_id should contain the Firebase user ID
    const userId = session.client_reference_id;
    const customerId = session.customer;

    // Update the user in Firebase
    await db.collection("users").doc(userId).update({
      stripeCustomerId: customerId,
      isPro: true,
      proSince: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(
      `User ${userId} upgraded to PRO status with Stripe customer ID ${customerId}`
    );
  }
}

async function handleCustomerCreated(customer) {
  console.log("Customer created:", customer);
  // Could link newly created Stripe customers with Firebase users
  // This might be redundant if linking during checkout completion
}

async function handleCustomerDeleted(customer) {
  console.log("Customer deleted:", customer);

  // Find any Firebase users with this customer ID and update their status
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customer.id)
    .get();

  for (const doc of usersSnapshot.docs) {
    await doc.ref.update({
      isPro: false,
      stripeCustomerId: null,
      updatedAt: new Date().toISOString(),
    });
    console.log(`User ${doc.id} downgraded after Stripe customer deletion`);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log("Subscription created:", subscription);

  if (subscription.customer) {
    await updateUserSubscriptionStatus(
      subscription.customer,
      "active",
      subscription.current_period_end,
      subscription
    );
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log("Subscription canceled:", subscription);

  if (subscription.customer) {
    await updateUserSubscriptionStatus(
      subscription.customer,
      "canceled",
      null,
      subscription
    );
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log("Subscription updated:", subscription);

  if (subscription.customer) {
    const status = subscription.status;
    await updateUserSubscriptionStatus(
      subscription.customer,
      status,
      subscription.current_period_end,
      subscription
    );
  }
}

async function handleCustomerUpdated(customer) {
  console.log("Customer updated:", customer);

  // Update user details in Firebase if needed
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customer.id)
    .get();

  for (const doc of usersSnapshot.docs) {
    // Here you can update relevant customer information
    // such as email, name, etc. if they're stored in both systems
    await doc.ref.update({
      updatedAt: new Date().toISOString(),
    });
  }
}

async function handleInvoiceCreated(invoice) {
  console.log("Invoice created:", invoice);
  // Store invoice data in Firebase if needed
}

async function handleInvoiceOverdue(invoice) {
  console.log("Invoice overdue:", invoice);

  if (invoice.customer) {
    // Update user payment status in Firebase
    await updateUserPaymentStatus(invoice.customer, "overdue", invoice);
  }
}

async function handleInvoicePaid(invoice) {
  console.log("Invoice paid:", invoice);

  if (invoice.customer) {
    // Extend subscription or update status in Firebase
    await updateUserPaymentStatus(invoice.customer, "paid", invoice);

    // If this is a subscription invoice, update subscription end date
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      );
      await updateUserSubscriptionStatus(
        invoice.customer,
        "active",
        subscription.current_period_end,
        subscription
      );
    }
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log("Invoice payment failed:", invoice);

  if (invoice.customer) {
    await updateUserPaymentStatus(invoice.customer, "failed", invoice);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log("Payment intent failed:", paymentIntent);

  if (paymentIntent.customer) {
    await updateUserPaymentStatus(
      paymentIntent.customer,
      "failed",
      paymentIntent
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log("Payment intent succeeded:", paymentIntent);

  if (paymentIntent.customer) {
    await updateUserPaymentStatus(
      paymentIntent.customer,
      "succeeded",
      paymentIntent
    );
  }
}

// Helper functions
async function updateUserPaymentStatus(customerId, status, data) {
  // Find users with this Stripe customer ID
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .get();

  if (usersSnapshot.empty) {
    console.log(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  for (const doc of usersSnapshot.docs) {
    // Update user's payment status
    await doc.ref.update({
      paymentStatus: status,
      lastPaymentEvent: {
        type: status,
        timestamp: new Date().toISOString(),
        data: {
          id: data.id,
          amount: data.amount_total || data.amount || 0,
          currency: data.currency,
          date: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    });
    console.log(`Updated payment status for user ${doc.id} to ${status}`);
  }
}

async function updateUserSubscriptionStatus(
  customerId,
  status,
  periodEnd,
  subscription
) {
  // Find users with this Stripe customer ID
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .get();

  if (usersSnapshot.empty) {
    console.log(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  for (const doc of usersSnapshot.docs) {
    const updates = {
      subscriptionStatus: status,
      updatedAt: new Date().toISOString(),
    };

    // Only set these properties if relevant
    if (status === "active") {
      updates.isPro = true;
    } else if (status === "canceled" || status === "unpaid") {
      updates.isPro = false;
    }

    if (periodEnd) {
      updates.subscriptionPeriodEnd = new Date(periodEnd * 1000).toISOString();
    }

    await doc.ref.update(updates);
    console.log(`Updated subscription status for user ${doc.id} to ${status}`);
  }
}

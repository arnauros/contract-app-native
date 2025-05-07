import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../../../lib/firebase/admin";

// Initialize Firebase Admin if not already initialized
initAdmin();
const db = getFirestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // Get the user ID from the request
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify this is a valid Firebase user
    try {
      await getAuth().getUser(userId);
    } catch (error) {
      console.error("Invalid user ID:", error);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Check if user already has a Stripe customer ID
    const userDoc = await db.collection("users").doc(userId).get();
    let customerId;

    if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
      // Use existing Stripe customer
      customerId = userDoc.data().stripeCustomerId;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
      // Add client_reference_id to link this checkout to Firebase user
      client_reference_id: userId,
      // If we have a customerId, use it
      ...(customerId && { customer: customerId }),
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}

import Stripe from "stripe";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkPayments() {
  try {
    console.log("🔍 Checking payments for: hello@arnau.design");

    // Get customer
    const customers = await stripe.customers.list({
      email: "hello@arnau.design",
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log("❌ No customer found");
      return;
    }

    const customer = customers.data[0];
    console.log("✅ Customer ID:", customer.id);

    // Check payment intents
    console.log("\n💳 Checking Payment Intents...");
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customer.id,
      limit: 10,
    });

    console.log(`Found ${paymentIntents.data.length} payment intent(s):`);
    paymentIntents.data.forEach((pi, index) => {
      console.log(`${index + 1}. Payment Intent: ${pi.id}`);
      console.log(`   Status: ${pi.status}`);
      console.log(`   Amount: ${pi.amount / 100} ${pi.currency.toUpperCase()}`);
      console.log(`   Created: ${new Date(pi.created * 1000).toISOString()}`);
      console.log(`   Description: ${pi.description || "N/A"}`);
    });

    // Check checkout sessions
    console.log("\n🛒 Checking Checkout Sessions...");
    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      limit: 10,
    });

    console.log(`Found ${sessions.data.length} checkout session(s):`);
    sessions.data.forEach((session, index) => {
      console.log(`${index + 1}. Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Mode: ${session.mode}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(
        `   Created: ${new Date(session.created * 1000).toISOString()}`
      );
      console.log(`   Subscription: ${session.subscription || "N/A"}`);
      console.log(`   Customer: ${session.customer}`);
    });

    // Check charges
    console.log("\n💰 Checking Charges...");
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 10,
    });

    console.log(`Found ${charges.data.length} charge(s):`);
    charges.data.forEach((charge, index) => {
      console.log(`${index + 1}. Charge: ${charge.id}`);
      console.log(`   Status: ${charge.status}`);
      console.log(
        `   Amount: ${charge.amount / 100} ${charge.currency.toUpperCase()}`
      );
      console.log(
        `   Created: ${new Date(charge.created * 1000).toISOString()}`
      );
      console.log(`   Description: ${charge.description || "N/A"}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkPayments();

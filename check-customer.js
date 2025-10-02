import Stripe from "stripe";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkCustomer() {
  try {
    console.log("🔍 Checking customer: hello@arnau.design");

    const customers = await stripe.customers.list({
      email: "hello@arnau.design",
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log("❌ No customer found with email hello@arnau.design");
      return;
    }

    const customer = customers.data[0];
    console.log("✅ Customer found:", customer.id);
    console.log("📧 Email:", customer.email);
    console.log("📅 Created:", new Date(customer.created * 1000).toISOString());

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
    });

    console.log(`\n📊 Found ${subscriptions.data.length} subscription(s):`);

    if (subscriptions.data.length === 0) {
      console.log("❌ No subscriptions found");
      return;
    }

    subscriptions.data.forEach((sub, index) => {
      console.log(`\n${index + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Created: ${new Date(sub.created * 1000).toISOString()}`);
      console.log(
        `   Current Period End: ${new Date(sub.current_period_end * 1000).toISOString()}`
      );
      console.log(`   Cancel at Period End: ${sub.cancel_at_period_end}`);

      if (sub.items && sub.items.data.length > 0) {
        sub.items.data.forEach((item) => {
          console.log(`   Price ID: ${item.price.id}`);
          console.log(
            `   Amount: ${item.price.unit_amount / 100} ${item.price.currency.toUpperCase()}`
          );
        });
      }
    });

    // Check for active subscriptions
    const activeSubscriptions = subscriptions.data.filter(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    if (activeSubscriptions.length > 0) {
      console.log(
        `\n✅ Found ${activeSubscriptions.length} active subscription(s)`
      );
    } else {
      console.log("\n❌ No active subscriptions found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkCustomer();

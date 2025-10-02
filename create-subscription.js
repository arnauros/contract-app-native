import Stripe from "stripe";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createSubscription() {
  try {
    console.log("🔍 Creating subscription for: hello@arnau.design");

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

    // Get the monthly price ID from environment
    const priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    console.log("💰 Using price ID:", priceId);

    // Create a test payment method first
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: "4242424242424242",
        exp_month: 12,
        exp_year: 2025,
        cvc: "123",
      },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    console.log("✅ Payment method created and attached:", paymentMethod.id);

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: priceId,
        },
      ],
      default_payment_method: paymentMethod.id,
      expand: ["latest_invoice.payment_intent"],
    });

    console.log("✅ Subscription created:", subscription.id);
    console.log("📊 Status:", subscription.status);
    if (subscription.current_period_end) {
      console.log(
        "📅 Current period end:",
        new Date(subscription.current_period_end * 1000).toISOString()
      );
    }

    // Get the latest invoice and mark it as paid
    if (subscription.latest_invoice) {
      const invoice = subscription.latest_invoice;
      console.log("📄 Invoice ID:", invoice.id);

      // Mark invoice as paid
      const paidInvoice = await stripe.invoices.pay(invoice.id);
      console.log("✅ Invoice paid:", paidInvoice.id);
      console.log("📊 Invoice status:", paidInvoice.status);
    }

    // Retrieve the updated subscription
    const updatedSubscription = await stripe.subscriptions.retrieve(
      subscription.id
    );
    console.log("✅ Subscription status updated:", updatedSubscription.id);
    console.log("📊 Final status:", updatedSubscription.status);

    return updatedSubscription;
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.type) {
      console.error("Error type:", error.type);
    }
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

createSubscription();

import crypto from "crypto";
import http from "http";

// Test webhook payload
const payload = JSON.stringify({
  id: "evt_test_webhook",
  object: "event",
  type: "customer.subscription.created",
  data: {
    object: {
      id: "sub_test123",
      customer: "cus_test123",
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      cancel_at_period_end: false,
    },
  },
  created: Math.floor(Date.now() / 1000),
});

// Get webhook secret from environment
const webhookSecret = "whsec_repMvy1wo9GjWlpHTCwxdyuHjdYCgA9Z";

// Create signature
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(signedPayload, "utf8")
  .digest("hex");

const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log("🧪 Testing Stripe webhook with Firebase Admin enabled...");
console.log("📋 Event type: customer.subscription.created");
console.log("🔑 Signature: Valid Stripe signature");

// Test the webhook
const postData = payload;

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/stripe/webhooks",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
    "stripe-signature": stripeSignature,
  },
};

const req = http.request(options, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("📄 Response Body:", data);

    if (res.statusCode === 200) {
      console.log("✅ SUCCESS: Webhook processed successfully!");
      console.log("🎉 Stripe webhook 500 errors are now fixed!");
    } else if (res.statusCode === 500) {
      console.log("❌ ERROR: Still getting 500 error");
      console.log("🔍 Check server logs for details");
    } else {
      console.log(`⚠️  Unexpected status code: ${res.statusCode}`);
    }
  });
});

req.on("error", (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

req.write(postData);
req.end();

#!/usr/bin/env node

/**
 * Test webhook endpoint locally
 * This script helps test if the webhook endpoint is accessible
 */

const WEBHOOK_URL = "http://localhost:3000/api/stripe/webhook-test";

async function testWebhook() {
  console.log("🔧 Testing webhook endpoint...");
  console.log(`URL: ${WEBHOOK_URL}`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Stripe-Webhook-Test/1.0",
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Webhook endpoint is accessible");
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.log(
        "❌ Webhook endpoint returned error:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.log("Error details:", errorText);
    }
  } catch (error) {
    console.log("❌ Failed to connect to webhook endpoint");
    console.log("Error:", error.message);
    console.log("");
    console.log("Make sure your development server is running:");
    console.log("  npm run dev");
  }
}

async function testMainWebhook() {
  console.log("🔧 Testing main webhook endpoint...");
  console.log("URL: http://localhost:3000/api/stripe/webhooks");

  try {
    const response = await fetch("http://localhost:3000/api/stripe/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Stripe-Webhook-Test/1.0",
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
      }),
    });

    if (response.status === 400) {
      console.log(
        "✅ Main webhook endpoint is accessible (signature verification working)"
      );
      const errorData = await response.json();
      console.log("Expected error (signature verification):", errorData.error);
    } else {
      console.log(
        "⚠️  Main webhook endpoint returned unexpected status:",
        response.status
      );
      const responseText = await response.text();
      console.log("Response:", responseText);
    }
  } catch (error) {
    console.log("❌ Failed to connect to main webhook endpoint");
    console.log("Error:", error.message);
  }
}

async function main() {
  console.log("🚀 Starting webhook tests...\n");

  await testWebhook();
  console.log("");
  await testMainWebhook();

  console.log("\n📋 Next steps:");
  console.log("1. If tests pass, your webhook endpoints are accessible");
  console.log("2. For local development, use Stripe CLI:");
  console.log(
    "   stripe listen --forward-to http://localhost:3000/api/stripe/webhooks"
  );
  console.log("3. For production, configure webhook in Stripe Dashboard");
  console.log(
    "4. Visit http://localhost:3000/stripe-test for comprehensive testing"
  );
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Test script for email notifications
 * This script tests the notification API endpoints
 */

import fetch from "node-fetch";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function testNotificationAPI() {
  console.log("🧪 Testing Email Notification API...\n");

  const testData = {
    to: "hello@arnau.design", // Resend test mode only allows sending to this email
    recipientName: "Test User",
    signerName: "John Designer",
    contractId: "test-contract-123",
    contractTitle: "Test Contract",
    notificationType: "designer_signed",
  };

  try {
    console.log("📧 Sending test notification...");
    console.log("Data:", JSON.stringify(testData, null, 2));

    const response = await fetch(`${BASE_URL}/api/sendNotification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Notification sent successfully!");
      console.log("Response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Notification failed!");
      console.log("Status:", response.status);
      console.log("Error:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ Error testing notification:", error.message);
  }
}

async function testAllNotificationTypes() {
  console.log("🧪 Testing all notification types...\n");

  const notificationTypes = [
    {
      type: "designer_signed",
      description: "Designer signed notification",
    },
    {
      type: "client_signed",
      description: "Client signed notification",
    },
    {
      type: "contract_complete",
      description: "Contract complete notification",
    },
  ];

  for (const notification of notificationTypes) {
    console.log(`\n📧 Testing ${notification.description}...`);

    const testData = {
      to: "hello@arnau.design", // Resend test mode only allows sending to this email
      recipientName: "Test User",
      signerName: "John Designer",
      contractId: "test-contract-123",
      contractTitle: "Test Contract",
      notificationType: notification.type,
    };

    try {
      const response = await fetch(`${BASE_URL}/api/sendNotification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ ${notification.description} sent successfully!`);
      } else {
        console.log(`❌ ${notification.description} failed!`);
        console.log("Error:", result.error);
      }
    } catch (error) {
      console.error(
        `❌ Error testing ${notification.description}:`,
        error.message
      );
    }
  }
}

async function main() {
  console.log("🚀 Starting Email Notification Tests\n");
  console.log("Base URL:", BASE_URL);
  console.log("Make sure your Next.js server is running!\n");

  // Test single notification
  await testNotificationAPI();

  console.log("\n" + "=".repeat(50) + "\n");

  // Test all notification types
  await testAllNotificationTypes();

  console.log("\n🎉 Notification tests completed!");
  console.log("\nNext steps:");
  console.log("1. Check your email inbox for the test notifications");
  console.log("2. Test the actual signature flow in the app");
  console.log("3. Verify notifications are sent when signatures are completed");
}

// Run main function if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testNotificationAPI, testAllNotificationTypes };

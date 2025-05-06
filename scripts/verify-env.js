/**
 * This script checks if all required Firebase environment variables are properly set.
 * Run with: node scripts/verify-env.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(path.join(__dirname, ".."), ".env.local");
try {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
  console.log("✅ Loaded environment variables from .env.local");
} catch (err) {
  console.error("❌ Error loading .env.local file:", err.message);
  process.exit(1);
}

// Check client-side Firebase config
const clientRequiredVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

console.log("\n📋 Checking client-side Firebase configuration:");
const missingClientVars = clientRequiredVars.filter((key) => !process.env[key]);

if (missingClientVars.length > 0) {
  console.error(
    "❌ Missing client-side Firebase variables:",
    missingClientVars.join(", ")
  );
} else {
  console.log("✅ All client-side Firebase variables are set");
}

// Check server-side Firebase config (service account)
console.log("\n📋 Checking server-side Firebase configuration:");
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set");
} else {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    const requiredFields = ["project_id", "private_key", "client_email"];
    const missingFields = requiredFields.filter(
      (field) => !serviceAccount[field]
    );

    if (missingFields.length > 0) {
      console.error(
        "❌ Service account is missing required fields:",
        missingFields.join(", ")
      );
    } else {
      console.log("✅ Service account JSON has all required fields");

      // Verify the client and server configs match the same project
      if (
        serviceAccount.project_id !==
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ) {
        console.error(
          "❌ Project ID mismatch between client and server config!"
        );
        console.log(
          `   Client: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`
        );
        console.log(`   Server: ${serviceAccount.project_id}`);
      } else {
        console.log("✅ Project IDs match between client and server config");
      }
    }
  } catch (err) {
    console.error(
      "❌ Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Not valid JSON:",
      err.message
    );
  }
}

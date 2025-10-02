import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Decode the base64 service account key
const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const decodedKey = Buffer.from(encodedKey, "base64").toString("utf8");
const serviceAccount = JSON.parse(decodedKey);

// Fix the private key by replacing literal \n with actual newlines
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

// Re-encode as base64
const fixedKey = Buffer.from(JSON.stringify(serviceAccount)).toString("base64");

console.log("Fixed FIREBASE_SERVICE_ACCOUNT_KEY:");
console.log(fixedKey);

// Test if the key can be parsed correctly
try {
  const testDecoded = Buffer.from(fixedKey, "base64").toString("utf8");
  const testParsed = JSON.parse(testDecoded);
  console.log("✅ Key format is valid");
  console.log("Project ID:", testParsed.project_id);
  console.log("Client Email:", testParsed.client_email);
} catch (error) {
  console.error("❌ Key format is still invalid:", error.message);
}

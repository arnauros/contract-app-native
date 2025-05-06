/**
 * This script fixes the FIREBASE_SERVICE_ACCOUNT_KEY formatting in .env.local
 * Run with: node scripts/fix-service-account.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(path.join(__dirname, ".."), ".env.local");

try {
  console.log(`Reading .env.local file from ${envPath}`);
  let envContent = fs.readFileSync(envPath, "utf8");

  // Find the service account key line and replace it
  const serviceAccountRegex = /(FIREBASE_SERVICE_ACCOUNT_KEY=)({.*?})/s;
  const match = envContent.match(serviceAccountRegex);

  if (!match) {
    console.error("Could not find FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
    process.exit(1);
  }

  // Extract the JSON part and validate it
  const jsonPart = match[2];

  try {
    // Validate the JSON is parseable
    const parsedJson = JSON.parse(jsonPart);
    console.log("Service account JSON is valid");

    // Reformat the line with proper quoting
    const newEntry = `${match[1]}'${JSON.stringify(parsedJson)}'`;

    // Replace in the file content
    envContent = envContent.replace(serviceAccountRegex, newEntry);

    // Write back to the file
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log(
      "✅ Successfully updated FIREBASE_SERVICE_ACCOUNT_KEY format in .env.local"
    );
  } catch (jsonError) {
    console.error("Invalid JSON in service account key:", jsonError);

    // Try to recover by escaping newlines and wrapping in quotes
    console.log("Attempting to fix malformed JSON...");

    // Assume the JSON is not properly quoted and has no surrounding quotes
    const fixedEntry = `${match[1]}'${jsonPart.replace(/\n/g, "\\n")}'`;

    // Replace in the file content
    envContent = envContent.replace(serviceAccountRegex, fixedEntry);

    // Write back to the file
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log(
      "⚠️ Applied basic fix to FIREBASE_SERVICE_ACCOUNT_KEY in .env.local"
    );
    console.log(
      "Please verify the format is correct by running the verify-env.js script"
    );
  }
} catch (error) {
  console.error("Error updating .env.local file:", error);
  process.exit(1);
}

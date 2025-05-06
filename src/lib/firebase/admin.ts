import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set"
    );
  }

  try {
    // Ensure we get a properly formatted JSON object
    let serviceAccount;

    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (parseError) {
      console.error("Failed to parse service account key:", parseError);
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON."
      );
    }

    // Validate required service account fields
    const requiredFields = ["project_id", "private_key", "client_email"];
    const missingFields = requiredFields.filter(
      (field) => !serviceAccount[field]
    );

    if (missingFields.length > 0) {
      console.error(
        "Missing required fields in service account:",
        missingFields
      );
      throw new Error(
        `Invalid service account configuration. Missing fields: ${missingFields.join(
          ", "
        )}`
      );
    }

    // Log success (but don't log sensitive data)
    console.log(
      "Initializing Firebase Admin with service account for project:",
      serviceAccount.project_id
    );

    initializeApp({
      credential: cert(serviceAccount),
    });

    console.log("Firebase Admin successfully initialized");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    if (error instanceof SyntaxError) {
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON."
      );
    }
    throw error;
  }
}

export const adminAuth = getAuth();

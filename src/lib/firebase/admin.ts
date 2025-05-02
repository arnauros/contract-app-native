import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set"
    );
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    // Validate required service account fields
    const requiredFields = ["project_id", "private_key", "client_email"];
    const missingFields = requiredFields.filter(
      (field) => !serviceAccount[field]
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Invalid service account configuration. Missing fields: ${missingFields.join(
          ", "
        )}`
      );
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON."
      );
    }
    throw error;
  }
}

export const adminAuth = getAuth();

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Initializes Firebase Admin SDK if it hasn't been initialized already
 * @returns boolean indicating success
 */
export function initAdmin() {
  // If already initialized, return
  if (getApps().length > 0) {
    console.log("Firebase Admin already initialized");
    return true;
  }

  // Check for service account key
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set"
    );
    // In development mode, we can gracefully degrade
    if (process.env.NODE_ENV === "development") {
      console.warn("Running in development mode without Firebase Admin SDK");
      return false;
    }
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
      if (process.env.NODE_ENV === "development") {
        console.warn("Running in development mode without Firebase Admin SDK");
        return false;
      }
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
      if (process.env.NODE_ENV === "development") {
        console.warn("Running in development mode without Firebase Admin SDK");
        return false;
      }
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

    // Initialize the app with the service account credentials
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin successfully initialized");
      return true;
    } catch (error) {
      console.error("Error initializing Firebase Admin app:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("Running in development mode without Firebase Admin SDK");
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    if (error instanceof SyntaxError) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Running in development mode without Firebase Admin SDK");
        return false;
      }
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON."
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.warn("Running in development mode without Firebase Admin SDK");
      return false;
    }
    throw error;
  }
}

// Variable to track initialization status
let isInitialized = false;

// Try to initialize on import but don't crash if it fails
try {
  isInitialized = initAdmin();
} catch (error) {
  console.error("Failed to auto-initialize Firebase Admin:", error);
  isInitialized = false;
}

// Safe version of getAuth that handles cases where admin isn't initialized
export const adminAuth = (() => {
  try {
    if (!isInitialized && process.env.NODE_ENV === "development") {
      // Return a mock object in development mode
      console.log("Using mock Firebase Admin Auth in development");
      return {
        verifyIdToken: async () => ({
          uid: "mock-user-id",
          email: "mock@example.com",
        }),
        // Add other methods as needed
      };
    }
    return getAuth();
  } catch (error) {
    console.error("Error getting adminAuth:", error);
    // Return a mock object that will gracefully degrade
    if (process.env.NODE_ENV === "development") {
      console.log("Using mock Firebase Admin Auth after error");
      return {
        verifyIdToken: async () => ({
          uid: "mock-user-id",
          email: "mock@example.com",
        }),
        // Add other methods as needed
      };
    }
    throw error;
  }
})();

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Initializes Firebase Admin SDK if it hasn't been initialized already
 * @returns boolean indicating success
 */
export function initAdmin() {
  // Skip initialization during build process
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("Skipping Firebase Admin initialization during build");
    return false;
  }

  // If already initialized, return
  if (getApps().length > 0) {
    console.log("Firebase Admin already initialized");
    return true;
  }

  // Check for service account key
  if (
    !process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY === "disabled-for-development"
  ) {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set or disabled for development"
    );
    // In development mode or build process, we can gracefully degrade
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PHASE === "phase-production-build"
    ) {
      console.warn("Running without Firebase Admin SDK");
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
      // Check if the key is base64 encoded (starts with base64 chars)
      const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (key && key.match(/^[A-Za-z0-9+/=]+$/) && key.length > 100) {
        // It's base64 encoded, decode it first
        const decoded = Buffer.from(key, "base64").toString("utf8");
        serviceAccount = JSON.parse(decoded);
      } else {
        // It's direct JSON
        serviceAccount = JSON.parse(key);
      }
    } catch (parseError) {
      console.error("Failed to parse service account key:", parseError);
      if (process.env.NODE_ENV === "development") {
        console.warn("Running in development mode without Firebase Admin SDK");
        return false;
      }
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON or base64-encoded JSON."
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
// Skip initialization during build process
if (
  typeof window === "undefined" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  try {
    isInitialized = initAdmin();
  } catch (error) {
    console.error("Failed to auto-initialize Firebase Admin:", error);
    isInitialized = false;
  }
} else {
  console.log(
    "Skipping Firebase Admin initialization during build or client-side"
  );
  isInitialized = false;
}

// Safe version of getAuth that handles cases where admin isn't initialized
export const adminAuth = (() => {
  try {
    // Return mock object during build or when not initialized
    if (!isInitialized || process.env.NEXT_PHASE === "phase-production-build") {
      console.log(
        "Using mock Firebase Admin Auth during build or when not initialized"
      );
      return {
        verifyIdToken: async () => ({
          uid: "mock-user-id",
          email: "mock@example.com",
        }),
        createSessionCookie: async (
          token: string,
          options: { expiresIn: number }
        ) => {
          console.log(
            "Mock createSessionCookie called with token:",
            token?.slice(0, 10) + "..."
          );
          return "mock-session-cookie-" + Date.now();
        },
        getUser: async (uid: string) => ({
          uid: uid || "mock-user-id",
          email: "mock@example.com",
          displayName: "Mock User",
          customClaims: {},
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
          },
        }),
        setCustomUserClaims: async (uid: string, claims: any) => {
          console.log(
            "Mock setCustomUserClaims called for uid:",
            uid,
            "claims:",
            claims
          );
          return Promise.resolve();
        },
        // Add other methods as needed
      };
    }
    return getAuth();
  } catch (error) {
    console.error("Error getting adminAuth:", error);
    // Return a mock object that will gracefully degrade
    console.log("Using mock Firebase Admin Auth after error");
    return {
      verifyIdToken: async () => ({
        uid: "mock-user-id",
        email: "mock@example.com",
      }),
      createSessionCookie: async (
        token: string,
        options: { expiresIn: number }
      ) => {
        console.log(
          "Mock createSessionCookie called with token:",
          token?.slice(0, 10) + "..."
        );
        return "mock-session-cookie-" + Date.now();
      },
      getUser: async (uid: string) => ({
        uid: uid || "mock-user-id",
        email: "mock@example.com",
        displayName: "Mock User",
        customClaims: {},
        emailVerified: true,
        disabled: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
      }),
      setCustomUserClaims: async (uid: string, claims: any) => {
        console.log(
          "Mock setCustomUserClaims called for uid:",
          uid,
          "claims:",
          claims
        );
        return Promise.resolve();
      },
      // Add other methods as needed
    };
  }
})();

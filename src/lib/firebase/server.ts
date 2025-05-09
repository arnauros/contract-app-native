import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin for server-side operations
export function initServerFirebase() {
  if (getApps().length > 0) {
    return {
      auth: getAuth(),
      db: getFirestore(),
    };
  }

  try {
    // Get service account from environment variable
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error(
        "Firebase service account key is not set in environment variables"
      );
    }

    // Parse the service account key
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      throw new Error("Failed to parse Firebase service account key");
    }

    // Initialize the app
    initializeApp({
      credential: cert(serviceAccount),
    });

    return {
      auth: getAuth(),
      db: getFirestore(),
    };
  } catch (error) {
    console.error("Error initializing server Firebase:", error);
    throw error;
  }
}

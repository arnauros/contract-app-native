"use client";

import { initializeApp, getApps, FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";

let app: ReturnType<typeof initializeApp> | null = null;

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
export const initFirebase = () => {
  try {
    // If app is already initialized, return it
    if (getApps().length > 0) {
      return getApps()[0];
    }

    if (!app) {
      // Debug logging
      console.log("Initializing Firebase with config:", {
        apiKey: firebaseConfig.apiKey ? "set" : "not set",
        authDomain: firebaseConfig.authDomain ? "set" : "not set",
        projectId: firebaseConfig.projectId ? "set" : "not set",
      });

      // Validate required config
      const requiredKeys = ["apiKey", "authDomain", "projectId"] as const;
      const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

      if (missingKeys.length > 0) {
        console.error("Missing Firebase configuration:", missingKeys);
        throw new Error(
          `Missing required Firebase configuration: ${missingKeys.join(", ")}`
        );
      }

      try {
        app = initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully:", app.name);

        // Initialize Firestore
        const db = getFirestore(app);
        console.log("Firestore initialized");

        return app;
      } catch (initError: any) {
        console.error("Firebase initialization error:", initError);
        throw new Error(
          `Firebase initialization failed: ${
            initError?.message || "Unknown error"
          }`
        );
      }
    }

    return app;
  } catch (error: any) {
    console.error("Error in initFirebase:", error);

    // In development, we can tolerate errors for testing
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      console.warn(
        "Continuing despite Firebase initialization error in development"
      );
      return null;
    }

    throw error;
  }
};

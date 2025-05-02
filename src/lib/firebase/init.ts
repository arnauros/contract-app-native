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

      app = initializeApp(firebaseConfig);
      getFirestore(app); // Initialize Firestore
    }

    return app || getApps()[0];
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    throw error;
  }
};

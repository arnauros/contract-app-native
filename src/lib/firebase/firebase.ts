"use client";

import {
  initializeApp,
  getApps,
  FirebaseOptions,
  FirebaseApp,
} from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
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

// Global instances
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

// Initialize Firebase only once
export function initFirebase() {
  // Return existing instances if already initialized
  if (firebaseApp && firebaseAuth && firebaseDb) {
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  }

  try {
    // Check for existing Firebase app
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      // Validate the Firebase configuration
      const requiredKeys = ["apiKey", "authDomain", "projectId"];
      const missingKeys = requiredKeys.filter(
        (key) => !firebaseConfig[key as keyof FirebaseOptions]
      );

      if (missingKeys.length > 0) {
        throw new Error(
          `Missing required Firebase configuration: ${missingKeys.join(", ")}`
        );
      }

      // Initialize the Firebase app
      firebaseApp = initializeApp(firebaseConfig);
    }

    // Initialize services
    if (firebaseApp) {
      firebaseAuth = getAuth(firebaseApp);
      firebaseDb = getFirestore(firebaseApp);
      getStorage(firebaseApp); // Initialize storage
    }

    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  } catch (error) {
    throw new Error(
      `Failed to initialize Firebase: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Initialize on import
try {
  initFirebase();
} catch (error) {
  // Silent initialization error - will be handled when services are used
}

// Export instances for use throughout the app
export const app = firebaseApp;
export const auth = firebaseAuth;
export const db = firebaseDb;

"use client";

import {
  initializeApp,
  getApps,
  FirebaseOptions,
  FirebaseApp,
} from "firebase/app";
import { getAuth, Auth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
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
let initializationAttempted = false;

// Initialize Firebase only once
export function initFirebase() {
  if (firebaseApp && firebaseAuth && firebaseDb) {
    return firebaseApp;
  }

  if (initializationAttempted && process.env.NODE_ENV !== "development") {
    console.warn("Firebase initialization already attempted and failed");
    return firebaseApp;
  }

  initializationAttempted = true;

  try {
    // Log Firebase config values for debugging (without showing actual values)
    console.log("Firebase config available:", {
      apiKey: firebaseConfig.apiKey ? "✓" : "✗",
      authDomain: firebaseConfig.authDomain ? "✓" : "✗",
      projectId: firebaseConfig.projectId ? "✓" : "✗",
      storageBucket: firebaseConfig.storageBucket ? "✓" : "✗",
      messagingSenderId: firebaseConfig.messagingSenderId ? "✓" : "✗",
      appId: firebaseConfig.appId ? "✓" : "✗",
    });

    // Check for existing Firebase app
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log("Using existing Firebase app");
      firebaseApp = existingApps[0];
    } else {
      // Validate the Firebase configuration
      const requiredKeys = ["apiKey", "authDomain", "projectId"];
      const missingKeys = requiredKeys.filter(
        (key) => !firebaseConfig[key as keyof FirebaseOptions]
      );

      if (missingKeys.length > 0) {
        console.error(
          `Missing required Firebase configuration: ${missingKeys.join(", ")}`
        );

        // In development mode, we can continue without proper config
        if (
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1") &&
          process.env.NODE_ENV === "development"
        ) {
          console.warn("Creating mock Firebase app for development");
          return null;
        } else {
          throw new Error(
            "Firebase configuration is invalid or missing required fields"
          );
        }
      }

      // Initialize the Firebase app
      firebaseApp = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully");
    }

    // Initialize services
    if (firebaseApp) {
      try {
        firebaseAuth = getAuth(firebaseApp);
        console.log("Firebase Auth initialized successfully");

        // Check if anonymous auth is disabled by environment variable
        const disableAnonymousAuth = true; // Always disable anonymous auth

        // Only attempt anonymous authentication if not disabled
        if (
          !disableAnonymousAuth &&
          firebaseAuth &&
          !firebaseAuth.currentUser
        ) {
          console.log("Attempting anonymous sign-in...");
          signInAnonymously(firebaseAuth).catch((error) => {
            // Don't treat this as a fatal error
            console.warn("Anonymous sign-in failed:", error.message);
          });
        } else if (disableAnonymousAuth) {
          console.log("Anonymous authentication is disabled by configuration");
        }
      } catch (error) {
        console.error("Failed to initialize Firebase Auth:", error);
        firebaseAuth = null;
      }

      try {
        firebaseDb = getFirestore(firebaseApp);
        console.log("Firebase Firestore initialized successfully");

        // Enable offline persistence if supported
        if (typeof window !== "undefined") {
          enableIndexedDbPersistence(firebaseDb).catch((err) => {
            if (err.code === "failed-precondition") {
              console.warn("Persistence failed: Multiple tabs open");
            } else if (err.code === "unimplemented") {
              console.warn("Persistence not available in this browser");
            } else {
              console.error("Persistence error:", err);
            }
          });
        }
      } catch (error) {
        console.error("Failed to initialize Firebase Firestore:", error);
        firebaseDb = null;
      }

      try {
        getStorage(firebaseApp);
        console.log("Firebase Storage initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Firebase Storage:", error);
      }
    }

    return firebaseApp;
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    firebaseApp = null;
    firebaseAuth = null;
    firebaseDb = null;

    return null;
  }
}

// Initialize on import
initFirebase();

// Export instances for use throughout the app
export const app = firebaseApp;
export const auth = firebaseAuth;
export const db = firebaseDb;

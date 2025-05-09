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
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initializationAttempted = false;

// Initialize Firebase only once
export function initFirebase() {
  if (app && auth && db) {
    return { app, auth, db };
  }

  if (initializationAttempted && process.env.NODE_ENV !== "development") {
    console.warn("Firebase initialization already attempted and failed");
    return { app, auth, db };
  }

  initializationAttempted = true;

  try {
    // Check for existing Firebase app
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log("Using existing Firebase app");
      app = existingApps[0];
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
          return { app: null, auth: null, db: null };
        } else {
          throw new Error(
            "Firebase configuration is invalid or missing required fields"
          );
        }
      }

      // Initialize the Firebase app
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully");
    }

    // Initialize services
    if (app) {
      try {
        auth = getAuth(app);
        console.log("Firebase Auth initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Firebase Auth:", error);
        auth = null;
      }

      try {
        db = getFirestore(app);
        console.log("Firebase Firestore initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Firebase Firestore:", error);
        db = null;
      }

      try {
        getStorage(app);
        console.log("Firebase Storage initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Firebase Storage:", error);
      }
    }

    return { app, auth, db };
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    app = null;
    auth = null;
    db = null;

    return { app, auth, db };
  }
}

// Initialize on import
initFirebase();

export { app, auth, db };

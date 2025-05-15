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
let firebaseStorage: any | null = null;

// Initialize Firebase only once
export function initFirebase() {
  // Return existing instances if already initialized
  if (firebaseApp && firebaseAuth && firebaseDb && firebaseStorage) {
    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firebaseDb,
      storage: firebaseStorage,
    };
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
      firebaseStorage = getStorage(firebaseApp); // Initialize storage

      // Set up CORS headers for Firebase Storage requests
      if (typeof window !== "undefined") {
        // Add a global fetch interceptor for Firebase Storage requests
        const originalFetch = window.fetch;

        window.fetch = async function (input, init = {}) {
          // Only intercept Firebase Storage requests
          if (
            typeof input === "string" &&
            input.includes("firebasestorage.googleapis.com")
          ) {
            console.log("Intercepting Firebase Storage request:", input);

            // Add CORS headers
            const newInit = {
              ...init,
              mode: "cors" as RequestMode,
              headers: {
                ...init.headers,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            };

            // For OPTIONS requests, handle them specially
            if (init.method === "OPTIONS") {
              return new Response(null, {
                status: 200,
                headers: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods":
                    "GET, POST, PUT, DELETE, OPTIONS",
                  "Access-Control-Allow-Headers":
                    "Content-Type, Authorization, X-Requested-With",
                  "Access-Control-Max-Age": "3600",
                },
              });
            }

            try {
              return await originalFetch(input, newInit);
            } catch (error) {
              console.error("Firebase Storage fetch error:", error);
              throw error;
            }
          }

          // For all other requests, use the original fetch
          return originalFetch(input, init);
        };
      }
    }

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firebaseDb,
      storage: firebaseStorage,
    };
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
export const storage = firebaseStorage;

// Let's add a quick debug log to see what's exported
console.log("Firebase module exports:", {
  auth: auth ? true : false,
  db: db ? true : false,
  app: app ? true : false,
  storage: storage ? true : false,
});

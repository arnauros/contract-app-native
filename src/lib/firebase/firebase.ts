"use client";

import {
  initializeApp,
  getApps,
  FirebaseOptions,
  FirebaseApp,
} from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  initializeFirestore,
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
      // Use initializeFirestore with long-polling to avoid ad-blocker issues with WebChannel
      try {
        firebaseDb = initializeFirestore(firebaseApp, {
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
        } as any);
      } catch (e) {
        // Fallback for environments where initializeFirestore options differ
        firebaseDb = getFirestore(firebaseApp);
      }
      firebaseStorage = getStorage(firebaseApp);
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

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    // example only – keep or remove
    // config.plugins.push(new webpack.DefinePlugin({}));
    return config;
  },
};
module.exports = nextConfig;

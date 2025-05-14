import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FirebaseApp } from "firebase/app";
import { initFirebase } from "./init";

let auth: Auth | null = null;
let db: Firestore | null = null;
let app: FirebaseApp | null = null;

// Initialize Firebase and get instances
const initializeFirebase = () => {
  if (!app) {
    try {
      app = initFirebase() as FirebaseApp;
      if (app) {
        auth = getAuth(app);
        db = getFirestore(app);
        getStorage(app); // Initialize Storage
        console.log("✅ Firebase initialized successfully");
      }
    } catch (error) {
      console.error("❌ Error initializing Firebase:", error);
      throw error;
    }
  }
  return { app, auth, db };
};

// Initialize on import
initializeFirebase();

export { app, auth, db };
export type { Firestore };
export { initializeFirebase };

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

async function setupTestUser() {
  try {
    // Initialize Firebase
    console.log("Initializing Firebase...");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Create test user
    console.log("Creating test user...");
    const testEmail = "test@example.com";
    const testPassword = "testpass123";

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      console.log("Test user created successfully:", {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      });
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        console.log("Test user already exists");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Setup failed:", error);
  }
}

// Run setup
setupTestUser();

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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

async function testContract() {
  try {
    // Initialize Firebase
    console.log("Initializing Firebase...");
    console.log("Firebase config:", {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "set" : "not set",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        ? "set"
        : "not set",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        ? "set"
        : "not set",
    });

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Sign in with test account
    console.log("Signing in...");
    const testEmail = "test@example.com";
    const testPassword = "testpass123";

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      console.log("Signed in successfully:", userCredential.user.uid);
    } catch (authError) {
      console.log(
        "Failed to sign in, proceeding with development access:",
        authError.message
      );
    }

    // Test contract data
    const testContract = {
      userId: auth.currentUser?.uid || "test-user-id",
      title: "Test Contract",
      content: {
        projectBrief: "This is a test project brief",
        techStack: "Test tech stack",
        startDate: "2024-04-26",
        endDate: "2024-05-03",
        attachments: [
          {
            name: "test-file.pdf",
            type: "application/pdf",
            size: 1024,
            lastModified: Date.now(),
          },
        ],
      },
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save contract
    console.log("Saving contract...");
    const contractRef = await addDoc(collection(db, "contracts"), testContract);
    console.log("Contract saved with ID:", contractRef.id);

    // Retrieve contract
    console.log("Retrieving contract...");
    const contractDoc = await getDoc(doc(db, "contracts", contractRef.id));

    if (contractDoc.exists()) {
      console.log("Retrieved contract:", contractDoc.data());
    } else {
      console.log("No contract found");
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run test
testContract();

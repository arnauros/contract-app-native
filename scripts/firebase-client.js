// Script to interact with Firestore using Firebase client SDK
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import dotenv from "dotenv";
import { createInterface } from "readline";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Firebase config:", {
  apiKey: firebaseConfig.apiKey ? "set" : "not set",
  authDomain: firebaseConfig.authDomain ? "set" : "not set",
  projectId: firebaseConfig.projectId ? "set" : "not set",
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Function to authenticate user
async function authenticateUser() {
  try {
    // Get user credentials
    console.log("Authentication required to access Firestore");
    const email = await question("Email: ");
    const password = await question("Password: ");

    // Sign in with email and password
    console.log("Signing in...");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log(`Signed in as ${userCredential.user.email}`);
    return userCredential.user;
  } catch (error) {
    console.error("Authentication error:", error.message);
    throw error;
  }
}

// Function to list all contracts
async function listContracts() {
  try {
    console.log("Fetching contracts...");

    const contractsRef = collection(db, "contracts");
    const q = query(contractsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("No contracts found");
      return [];
    }

    console.log(`Found ${snapshot.size} contracts:`);
    console.log("--------------------------------------------------------");
    console.log("| Contract ID                      | Title              |");
    console.log("--------------------------------------------------------");

    const contracts = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const title =
        data.title ||
        data.content?.blocks?.[0]?.data?.text ||
        "Untitled Contract";
      const truncatedTitle =
        title.length > 20 ? title.substring(0, 17) + "..." : title.padEnd(20);
      console.log(`| ${doc.id} | ${truncatedTitle} |`);

      contracts.push({
        id: doc.id,
        ...data,
      });
    });

    console.log("--------------------------------------------------------");
    return contracts;
  } catch (error) {
    console.error("Error listing contracts:", error);
    return [];
  }
}

// Function to create a comment for a contract
async function createComment(contractId, commentData) {
  try {
    console.log(`Creating comment for contract ${contractId}`);

    // Check if contract exists
    const contractRef = doc(db, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      console.error(`Contract with ID ${contractId} does not exist`);
      return null;
    }

    // Create comment
    const commentsCollection = collection(contractRef, "comments");
    const newComment = {
      blockId: commentData.blockId || "test-block-id",
      blockContent: commentData.blockContent || "Test content",
      comment: commentData.comment || "This is a test comment",
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid || "script-user",
      userName:
        commentData.userName || auth.currentUser?.email || "Script User",
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(commentsCollection, newComment);
    console.log(`Comment created successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Error creating comment:", error);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Authenticate user first
    await authenticateUser();

    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || "list";

    if (command === "list") {
      // List all contracts
      await listContracts();
    } else if (command === "comment") {
      // Create a comment for a contract
      const contractId = args[1];
      if (!contractId) {
        console.error("Please provide a contract ID");
        process.exit(1);
      }

      const commentText = args[2] || "This is a test comment added via script";

      const commentId = await createComment(contractId, {
        blockId: "test-block",
        blockContent: "Test Block Content",
        comment: commentText,
      });

      if (commentId) {
        console.log(`Successfully created comment with ID: ${commentId}`);
      }
    } else {
      console.log("Unknown command. Available commands: list, comment");
    }
  } catch (error) {
    console.error("Script execution failed:", error);
  } finally {
    // Close readline interface
    rl.close();
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    rl.close();
    process.exit(1);
  });

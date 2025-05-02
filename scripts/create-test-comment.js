// Script to create a test comment for a contract using Admin SDK
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function createTestComment(contractId) {
  try {
    // First check if the contract exists
    const contractRef = db.collection("contracts").doc(contractId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      console.error(`Contract ${contractId} does not exist`);
      return;
    }

    console.log(`Creating test comment for contract ${contractId}`);

    // Create a test comment in the comments subcollection
    const commentRef = contractRef.collection("comments").doc();
    await commentRef.set({
      blockId: "test-block-id",
      blockContent: "Test Block Content",
      comment: "This is a test comment created via Admin SDK script",
      timestamp: Timestamp.now(),
      userId: contractDoc.data().userId || "test-user",
      userName: "Test User",
      createdAt: new Date().toISOString(),
    });

    console.log(`Created test comment with ID: ${commentRef.id}`);
    console.log("Done!");

    return commentRef.id;
  } catch (error) {
    console.error("Error creating test comment:", error);
    throw error;
  }
}

// Get contract ID from command line arguments
const contractId = process.argv[2];

if (!contractId) {
  console.error("Please provide a contract ID as an argument");
  process.exit(1);
}

createTestComment(contractId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

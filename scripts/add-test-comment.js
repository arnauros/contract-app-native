// Script to create a test comment for a contract
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, doc } = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestComment(contractId) {
  try {
    console.log(`Creating test comment for contract ${contractId}`);

    // Create a new comment in the comments subcollection
    const contractRef = doc(db, "contracts", contractId);
    const commentsCollectionRef = collection(contractRef, "comments");

    const commentData = {
      blockId: "test-block-id",
      blockContent: "Test Block Content",
      comment: "This is a test comment created via script",
      timestamp: new Date(),
      userId: "test-user-id",
      userName: "Test User",
      createdAt: new Date().toISOString(),
    };

    const commentRef = await addDoc(commentsCollectionRef, commentData);
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

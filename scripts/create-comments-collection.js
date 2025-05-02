// Script to create a comments collection for a contract
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function createCommentsCollection(contractId) {
  try {
    // First check if the contract exists
    const contractRef = db.collection("contracts").doc(contractId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      console.error(`Contract ${contractId} does not exist`);
      return;
    }

    console.log(`Creating comments collection for contract ${contractId}`);

    // Create a sample comment in the comments subcollection
    const commentRef = contractRef.collection("comments").doc();
    await commentRef.set({
      blockId: "vcdJyj1DIf", // Example block ID
      blockContent: "Project Brief",
      comment: "This is a sample comment. Feel free to edit or delete this.",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: contractDoc.data().userId, // Use the contract owner's ID
      userName: "System",
      createdAt: new Date().toISOString(),
    });

    console.log(`Created sample comment with ID: ${commentRef.id}`);
    console.log("Done!");
  } catch (error) {
    console.error("Error creating comments collection:", error);
  }
}

// Get contract ID from command line arguments
const contractId = process.argv[2];

if (!contractId) {
  console.error("Please provide a contract ID as an argument");
  process.exit(1);
}

createCommentsCollection(contractId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

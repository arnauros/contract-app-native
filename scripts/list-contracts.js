// Script to list all contracts in Firestore
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function listContracts() {
  try {
    console.log("Fetching all contracts...");

    const contractsRef = db.collection("contracts");
    const snapshot = await contractsRef.get();

    if (snapshot.empty) {
      console.log("No contracts found in the database");
      return;
    }

    console.log(`Found ${snapshot.size} contracts:`);
    console.log("--------------------------------------------------------");
    console.log("| Contract ID                      | Title              |");
    console.log("--------------------------------------------------------");

    snapshot.forEach((doc) => {
      const data = doc.data();
      const title =
        data.title ||
        data.content?.blocks?.[0]?.data?.text ||
        "Untitled Contract";
      const truncatedTitle =
        title.length > 20 ? title.substring(0, 17) + "..." : title.padEnd(20);
      console.log(`| ${doc.id} | ${truncatedTitle} |`);
    });

    console.log("--------------------------------------------------------");
    console.log("To create a comment for a contract, run:");
    console.log("node scripts/create-test-comment.js CONTRACT_ID");
  } catch (error) {
    console.error("Error listing contracts:", error);
  }
}

listContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

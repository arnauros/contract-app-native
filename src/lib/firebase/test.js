import { initFirebase } from "./init.js";
import { saveContract } from "./firestore.js";
import { getFirestore, doc, collection, deleteDoc } from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

const waitForAuthInit = () => {
  return new Promise((resolve) => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // Unsubscribe once we get the auth state
      resolve(user);
    });
  });
};

const testContractCreation = async () => {
  try {
    // Initialize Firebase
    console.log("Initializing Firebase...");
    const app = initFirebase();
    if (!app) {
      throw new Error("Failed to initialize Firebase");
    }

    // Wait for auth initialization and get current user
    console.log("Waiting for auth initialization...");
    const initialUser = await waitForAuthInit();
    const auth = getAuth();

    if (!initialUser) {
      console.log("No authenticated user - attempting to sign in...");
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          "test@example.com",
          "testpass123"
        );
        console.log("Successfully signed in as:", userCredential.user.uid);
      } catch (signInError) {
        console.error("Failed to sign in:", signInError);
        throw new Error("Authentication failed");
      }
    }

    // Verify we have an authenticated user
    if (!auth.currentUser) {
      throw new Error("No authenticated user after sign-in attempt");
    }

    // Generate a test contract ID
    const db = getFirestore();
    const contractRef = doc(collection(db, "contracts"));
    const contractId = contractRef.id;

    // Create test contract data
    const testContract = {
      id: contractId,
      userId: auth.currentUser.uid,
      title: "Test Contract",
      content: {
        projectBrief: "Test project brief",
        techStack: "Test tech stack",
        startDate: "2024-04-14",
        endDate: "2024-05-14",
        attachments: [],
      },
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Attempting to save test contract...");
    console.log("Contract data:", JSON.stringify(testContract, null, 2));

    const result = await saveContract(testContract);

    if (result.error) {
      console.error("❌ Test failed - Error saving contract:", result.error);
      return false;
    }

    console.log(
      "✅ Test passed - Contract saved successfully with ID:",
      result.contractId
    );

    // Clean up - delete the test contract
    try {
      await deleteDoc(doc(db, "contracts", contractId));
      console.log("✅ Test cleanup successful - Contract deleted");
    } catch (cleanupError) {
      console.error("Warning: Could not clean up test contract:", cleanupError);
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    return false;
  }
};

// Run the test
testContractCreation().then((success) => {
  if (success) {
    console.log("🎉 All tests passed!");
  } else {
    console.error("💥 Test suite failed!");
    process.exit(1);
  }
});

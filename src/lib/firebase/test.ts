import { initFirebase } from "./init";
import { saveContract } from "./firestore";
import { getFirestore, doc, collection, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

interface Contract {
  id: string;
  userId: string;
  title: string;
  content: any;
  status: "draft" | "pending" | "signed";
  createdAt: any;
  updatedAt: any;
}

const testContractCreation = async () => {
  // Initialize Firebase
  try {
    const app = initFirebase();
    if (!app) {
      console.error("Failed to initialize Firebase");
      return false;
    }

    // Sign in with test user
    const auth = getAuth(app);
    console.log("Signing in with test user...");
    try {
      await signInWithEmailAndPassword(auth, "test@example.com", "testpass123");
      console.log("Successfully signed in");
    } catch (error) {
      console.error("Error signing in:", error);
      return false;
    }

    // Generate a test contract ID
    const db = getFirestore();
    const contractRef = doc(collection(db, "contracts"));
    const contractId = contractRef.id;

    // Create test contract data with a realistic brief
    const testContract: Contract = {
      id: contractId,
      userId: auth.currentUser?.uid || "test-user-id",
      title: "Website Development Project",
      content: {
        projectBrief:
          "I am building a website for a client that includes a responsive design, a content management system (CMS), e-commerce integration, and user authentication. The client needs 10 custom-designed pages with dynamic content, and the website must be optimized for SEO.",
        techStack:
          "The tech stack includes Next.js for the frontend, Firebase for backend and authentication, Stripe for payment processing, and a headless CMS for content management. We'll use Tailwind CSS for styling and implement SEO best practices.",
        startDate: "2024-04-14",
        endDate: "2024-06-14",
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

    console.log("✅ Test passed - Contract saved successfully");

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
    process.exit(0);
  } else {
    console.error("💥 Test suite failed!");
    process.exit(1);
  }
});

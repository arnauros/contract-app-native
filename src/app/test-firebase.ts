import { initializeFirebase, db } from "@/lib/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  getFirestore,
  DocumentData,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface Contract extends DocumentData {
  id: string;
  [key: string]: any;
}

// Simple function to test Firebase connectivity
export const testFirebaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  authStatus: boolean;
  user: any;
  firestoreTest?: any;
}> => {
  try {
    console.log("Testing Firebase connection...");

    // Initialize Firebase
    const { app, auth, db: firestore } = initializeFirebase();

    if (!app) {
      return {
        success: false,
        message: "Firebase app not initialized",
        authStatus: false,
        user: null,
      };
    }

    if (!firestore) {
      return {
        success: false,
        message: "Firestore not initialized",
        authStatus: false,
        user: null,
      };
    }

    // Check auth status
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    console.log("Auth status:", !!currentUser);
    console.log(
      "User:",
      currentUser
        ? {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
          }
        : "No user signed in"
    );

    // If user is signed in, try to write to Firestore
    let firestoreTest = null;

    if (currentUser) {
      try {
        // Try to read from Firestore first
        const contractsRef = collection(firestore, "contracts");
        const snapshot = await getDocs(contractsRef);
        const contracts: Contract[] = [];

        snapshot.forEach((doc) => {
          contracts.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log(`Found ${contracts.length} contracts`);

        if (contracts.length > 0) {
          // Try to read comments from first contract
          const firstContract = contracts[0];
          console.log("First contract:", firstContract.id);

          const commentsRef = collection(
            firestore,
            "contracts",
            firstContract.id,
            "comments"
          );
          const commentsSnapshot = await getDocs(commentsRef);

          console.log(
            `Found ${commentsSnapshot.size} comments for contract ${firstContract.id}`
          );

          // Try to add a test comment
          const testComment = {
            contractId: firstContract.id,
            blockId: "test-block",
            blockContent: "Test content",
            comment: "Test comment - please delete",
            userId: currentUser.uid,
            userName: currentUser.displayName || "Anonymous",
            userEmail: currentUser.email,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString(),
          };

          const docRef = await addDoc(commentsRef, testComment);
          console.log("Test comment added with ID:", docRef.id);

          firestoreTest = {
            contractId: firstContract.id,
            commentId: docRef.id,
            success: true,
          };
        }
      } catch (error: any) {
        console.error("Firestore test error:", error);
        firestoreTest = {
          error: error.message || "Unknown error",
          success: false,
        };
      }
    }

    return {
      success: true,
      message: "Firebase connection test completed",
      authStatus: !!currentUser,
      user: currentUser
        ? {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
          }
        : null,
      firestoreTest,
    };
  } catch (error: any) {
    console.error("Firebase test error:", error);
    return {
      success: false,
      message: error.message || "Unknown error during Firebase test",
      authStatus: false,
      user: null,
    };
  }
};

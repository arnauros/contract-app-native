import { initializeFirebase } from "@/lib/firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  getFirestore,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Function to test adding comments directly to Firestore
export const testAddComment = async (
  contractId: string
): Promise<{
  success: boolean;
  message: string;
  commentId?: string;
  error?: string;
}> => {
  try {
    console.log("Testing adding comment to contract:", contractId);

    // Initialize Firebase
    const { app, db: firestore } = initializeFirebase();

    if (!app || !firestore) {
      return {
        success: false,
        message: "Firebase not initialized",
        error: "Firebase app or Firestore not available",
      };
    }

    // Check authentication status
    const auth = getAuth();
    let user = auth.currentUser;

    // If not signed in, try anonymous sign-in
    if (!user) {
      console.log("No user signed in, attempting anonymous sign-in...");
      try {
        const credential = await signInAnonymously(auth);
        user = credential.user;
        console.log("Anonymous sign-in successful:", user.uid);
      } catch (signInError: any) {
        return {
          success: false,
          message: "Failed to sign in anonymously",
          error: signInError.message,
        };
      }
    }

    // Now try to add a comment
    console.log("Adding test comment to contract:", contractId);
    console.log("User:", user.uid);

    const commentsRef = collection(
      firestore,
      "contracts",
      contractId,
      "comments"
    );

    const commentData = {
      contractId,
      blockId: "test-block-" + Date.now(),
      blockContent: "Test block content",
      comment: "Test comment - " + new Date().toISOString(),
      userId: user.uid,
      userName: user.displayName || "Anonymous User",
      userEmail: user.email,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    // Add to Firestore
    const docRef = await addDoc(commentsRef, commentData);

    console.log("Comment added successfully! Comment ID:", docRef.id);

    return {
      success: true,
      message: "Comment added successfully",
      commentId: docRef.id,
    };
  } catch (error: any) {
    console.error("Error adding test comment:", error);

    return {
      success: false,
      message: "Failed to add comment",
      error: error.message || String(error),
    };
  }
};

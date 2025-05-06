import { initializeFirebase, db } from "@/lib/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  getFirestore,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Comment interface for type safety
interface CommentData {
  id?: string;
  contractId: string;
  blockId: string;
  blockContent: string;
  comment: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  timestamp: any;
  createdAt: string;
}

// Test function to directly add a comment to a contract
export const testAddComment = async (
  contractId: string
): Promise<{
  success: boolean;
  message: string;
  commentId?: string;
  error?: string;
}> => {
  try {
    console.log("Testing direct comment addition to contract:", contractId);

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
    } else {
      console.log("Already authenticated as:", user.uid);
    }

    // Now directly add a comment to the comments collection
    console.log("Adding test comment to contract:", contractId);
    console.log("User:", user.uid);

    // Create the comments collection for this contract if it doesn't exist
    const commentsRef = collection(
      firestore,
      "contracts",
      contractId,
      "comments"
    );

    const commentData: Omit<CommentData, "id"> = {
      contractId,
      blockId: "test-block-" + Date.now(),
      blockContent: "Test block content",
      comment: "Test comment - " + new Date().toISOString(),
      userId: user.uid,
      userName: user.displayName,
      userEmail: user.email,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    // Add to Firestore
    const docRef = await addDoc(commentsRef, commentData);

    console.log("Comment added successfully! Comment ID:", docRef.id);

    // Now try to read it back to confirm
    const commentsQuery = query(commentsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(commentsQuery);

    console.log("Found", snapshot.size, "comments for contract", contractId);

    snapshot.forEach((doc) => {
      console.log("Comment:", doc.id, doc.data());
    });

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

// Function to list all comments for a contract
export const listComments = async (
  contractId: string
): Promise<{
  success: boolean;
  commentCount?: number;
  comments?: Array<CommentData & DocumentData>;
  error?: string;
}> => {
  try {
    console.log("Listing comments for contract:", contractId);

    // Initialize Firebase
    const { db: firestore } = initializeFirebase();

    if (!firestore) {
      console.error("Firestore not initialized");
      return { success: false, error: "Firestore not initialized" };
    }

    // Get the comments collection
    const commentsRef = collection(
      firestore,
      "contracts",
      contractId,
      "comments"
    );

    // Query all comments
    const commentsQuery = query(commentsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(commentsQuery);

    console.log("Found", snapshot.size, "comments for contract", contractId);

    const comments: Array<CommentData & DocumentData> = [];
    snapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data(),
      } as CommentData & DocumentData);
      console.log("Comment:", doc.id, doc.data());
    });

    return {
      success: true,
      commentCount: snapshot.size,
      comments,
    };
  } catch (error: any) {
    console.error("Error listing comments:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

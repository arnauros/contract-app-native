import { NextRequest, NextResponse } from "next/server";
import { initFirebase } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  getFirestore,
  Firestore,
} from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, blockId, comment, userName } = body;

    // Validate required fields
    if (!contractId || !blockId || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new comment
    const commentData = {
      contractId,
      blockId,
      blockContent: body.blockContent || "Contract section",
      comment,
      timestamp: serverTimestamp(),
      userId: body.userId || "anonymous",
      userName: userName || "Anonymous",
      createdAt: new Date().toISOString(),
    };

    // Initialize Firebase
    const { app } = initFirebase();
    const firestore = getFirestore(app);

    // Add to Firestore
    const contractRef = doc(firestore, "contracts", contractId);
    const commentsCollectionRef = collection(contractRef, "comments");
    const commentRef = await addDoc(commentsCollectionRef, commentData);

    return NextResponse.json({
      success: true,
      commentId: commentRef.id,
      message: "Comment created successfully",
    });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}

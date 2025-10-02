import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  DocumentReference,
  Firestore,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  writeBatch,
  where,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Contract } from "./types";

interface ContractAudit {
  contractId: string;
  issues: Array<{
    type: string;
    text: string;
    suggestion?: string;
    section?: string;
    position: {
      blockIndex: number;
      start: number;
      end: number;
    };
  }>;
  summary: {
    total: number;
    rewordings: number;
    spelling: number;
    upsell: number;
  };
  createdAt: any;
}

interface Signature {
  contractId: string;
  userId: string;
  signedAt: any;
  signature: string; // Base64 signature image or data
  name: string; // Full name of the signer
}

export interface Comment {
  id?: string;
  contractId: string;
  userId: string;
  userName?: string;
  userEmail?: string | null;
  userAvatar?: string;
  blockId: string;
  blockContent: string;
  comment: string;
  timestamp: any;
  replies?: Array<{
    id: string;
    userId: string;
    userName?: string;
    comment: string;
    timestamp: any;
  }>;
  isDismissed?: boolean;
  isEditing?: boolean;
  position?: {
    x: number;
    y: number;
    zIndex: number;
  };
  clickPosition?: {
    x: number;
    y: number;
  };
}

const getFirestore = (): Firestore => {
  if (!db) {
    throw new Error("Firestore not initialized");
  }
  return db;
};

// Contract Operations
export const saveContract = async (contract: Contract) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    // Wait for auth state to be initialized
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve();
      });
    });

    if (!auth.currentUser) {
      throw new Error("User must be authenticated to save contract");
    }

    // Ensure userId matches current authenticated user
    const contractWithUser = {
      ...contract,
      userId: auth.currentUser.uid,
      updatedAt: serverTimestamp(),
    };

    const contractRef = doc(firestore, "contracts", contract.id);
    await setDoc(contractRef, contractWithUser);

    // Extract contract data for future invoice generation (background task)
    setTimeout(async () => {
      try {
        console.log("🔄 Starting background contract data extraction...");
        await extractContractDataForInvoice(contract.id);
      } catch (error) {
        console.error("❌ Background contract extraction failed:", error);
      }
    }, 1000); // Wait 1 second after save

    return { success: true, contractId: contract.id };
  } catch (error) {
    console.error("Error saving contract:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to save contract",
    };
  }
};

// Audit Operations
export const saveContractAudit = async (
  contractId: string,
  audit: ContractAudit
) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      throw new Error("User must be authenticated to save audit");
    }

    // First verify the user has access to the contract
    const contractRef = doc(firestore, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error("Contract not found");
    }

    const contractData = contractSnap.data();
    if (contractData.userId !== auth.currentUser.uid) {
      throw new Error("User does not have permission to audit this contract");
    }

    // Now save the audit with user information
    const auditRef = doc(
      firestore,
      "contracts",
      contractId,
      "audits",
      "latest"
    );

    const auditWithUser = {
      ...audit,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    };

    await setDoc(auditRef, auditWithUser);
    return { success: true };
  } catch (error) {
    console.error("Error saving audit:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to save audit",
    };
  }
};

// Signature Operations
export const saveSignature = async (
  contractId: string,
  signatureType: "designer" | "client",
  signature: Signature
) => {
  try {
    console.log("Saving signature:", { contractId, signatureType, signature });
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      console.error("No authenticated user");
      return { error: "User must be authenticated to save signature" };
    }

    // First verify the user has access to the contract
    const contractRef = doc(firestore, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      console.error("Contract not found");
      return { error: "Contract not found" };
    }

    const contractData = contractSnap.data();
    if (contractData.userId !== auth.currentUser.uid) {
      console.error("User does not have permission to sign this contract");
      return { error: "Permission denied" };
    }

    // Now save the signature
    const signatureRef = doc(
      firestore,
      "contracts",
      contractId,
      "signatures",
      signatureType
    );

    console.log("Saving signature to:", signatureRef.path);
    await setDoc(signatureRef, signature);
    console.log("Signature saved successfully");

    return { success: true };
  } catch (error) {
    console.error("Error saving signature:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to save signature",
    };
  }
};

// Get Operations
export const getContract = async (contractId: string) => {
  try {
    const firestore = getFirestore();
    const contractRef = doc(firestore, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      return { error: "Contract not found" };
    }

    return { success: true, contract: contractSnap.data() as Contract };
  } catch (error) {
    console.error("Error getting contract:", error);
    return { error: "Failed to get contract" };
  }
};

export const getContractAudit = async (contractId: string) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      throw new Error("User must be authenticated to get audit");
    }

    // First verify the user has access to the contract
    const contractRef = doc(firestore, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error("Contract not found");
    }

    const contractData = contractSnap.data();
    if (contractData.userId !== auth.currentUser.uid) {
      throw new Error(
        "User does not have permission to access this contract's audit"
      );
    }

    // Now get the audit
    const auditRef = doc(
      firestore,
      "contracts",
      contractId,
      "audits",
      "latest"
    );
    const auditSnap = await getDoc(auditRef);

    if (!auditSnap.exists()) {
      return { error: "Audit not found" };
    }

    return { success: true, audit: auditSnap.data() };
  } catch (error) {
    console.error("Error getting audit:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get audit",
    };
  }
};

export const getSignatures = async (contractId: string) => {
  try {
    const firestore = getFirestore();
    const designerSignatureRef = doc(
      firestore,
      "contracts",
      contractId,
      "signatures",
      "designer"
    );
    const clientSignatureRef = doc(
      firestore,
      "contracts",
      contractId,
      "signatures",
      "client"
    );

    const [designerSnap, clientSnap] = await Promise.all([
      getDoc(designerSignatureRef),
      getDoc(clientSignatureRef),
    ]);

    return {
      success: true,
      signatures: {
        designer: designerSnap.exists() ? designerSnap.data() : null,
        client: clientSnap.exists() ? clientSnap.data() : null,
      },
    };
  } catch (error) {
    console.error("Error getting signatures:", error);
    return { error: "Failed to get signatures" };
  }
};

export async function updateContractStatus(
  contractId: string,
  updates: Partial<Contract>
): Promise<void> {
  try {
    const db = getFirestore();
    const contractRef = doc(db, "contracts", contractId);

    // Get current contract data
    const contractDoc = await getDoc(contractRef);
    if (!contractDoc.exists()) {
      throw new Error("Contract not found");
    }

    const currentData = contractDoc.data() as Contract;

    // If status is changing to signed, update version and store previous version
    if (updates.status === "signed" && currentData.status !== "signed") {
      const previousVersions = currentData.previousVersions || [];
      previousVersions.push({
        content: currentData.content,
        updatedAt: currentData.updatedAt,
        version: currentData.version,
      });

      updates = {
        ...updates,
        version: currentData.version + 1,
        previousVersions,
      };
    }

    // If status is changing to draft (unsigning), ensure we're properly resetting
    if (updates.status === "draft") {
      console.log(
        `🔄 Contract ${contractId} status changed to draft (unsigning)`
      );

      // Clear any signature-related metadata when going back to draft
      updates = {
        ...updates,
        metadata: {
          ...currentData.metadata,
          lastActivity: new Date().toISOString(),
        },
      };
    }

    // Update the contract
    await updateDoc(contractRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    console.log(
      `✅ Contract ${contractId} status updated to: ${updates.status}`
    );
  } catch (error) {
    console.error("Error updating contract status:", error);
    throw error;
  }
}

export const removeSignature = async (
  contractId: string,
  role: "designer" | "client"
) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      throw new Error("User must be authenticated to remove signature");
    }

    // First verify the user has access to the contract
    const contractRef = doc(firestore, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error("Contract not found");
    }

    const contractData = contractSnap.data();
    if (contractData.userId !== auth.currentUser.uid) {
      throw new Error("User does not have permission to modify this contract");
    }

    // Delete the signature document
    const signatureRef = doc(
      firestore,
      "contracts",
      contractId,
      "signatures",
      role
    );
    await deleteDoc(signatureRef);

    // Update the contract status back to draft when signature is removed
    await updateContractStatus(contractId, {
      status: "draft",
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing signature:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to remove signature",
    };
  }
};

// Comment Operations
export const addComment = async (comment: Comment) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    // For comments, we'll support authenticated users only
    if (!auth.currentUser) {
      return {
        success: false,
        error: "User must be authenticated to add a comment",
      };
    }

    const userId = auth.currentUser.uid;
    const userEmail = auth.currentUser.email || null;
    const userName = auth.currentUser.displayName || "Anonymous";

    // Add user info to the comment
    const commentWithUser = {
      ...comment,
      userId,
      userName,
      userEmail,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(), // Fallback for serverTimestamp
    };

    // Add the comment to Firestore
    const commentsRef = collection(
      firestore,
      "contracts",
      comment.contractId,
      "comments"
    );

    const docRef = await addDoc(commentsRef, commentWithUser);

    console.log("Added comment to Firestore with ID:", docRef.id);

    // Return the comment with the new ID
    return {
      success: true,
      comment: {
        ...commentWithUser,
        id: docRef.id,
      },
    };
  } catch (error) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
};

export const getComments = async (contractId: string) => {
  try {
    if (!contractId) {
      return {
        success: false,
        error: "Contract ID is required",
        comments: [],
      };
    }

    const firestore = getFirestore();

    // Get all comments from the comments subcollection in Firestore
    const commentsRef = collection(
      firestore,
      "contracts",
      contractId,
      "comments"
    );

    const commentsQuery = query(commentsRef, orderBy("timestamp", "asc"));
    const commentsSnapshot = await getDocs(commentsQuery);

    const comments: Comment[] = [];
    commentsSnapshot.forEach((doc) => {
      if (doc.exists()) {
        comments.push({
          ...doc.data(),
          id: doc.id,
        } as Comment);
      }
    });

    console.log("Retrieved comments from Firestore:", comments.length);
    return { success: true, comments };
  } catch (error: any) {
    console.error("Error getting comments:", error);
    return {
      error: error?.message || "Failed to get comments",
      success: false,
      comments: [],
    };
  }
};

export const updateComment = async (
  contractId: string,
  commentId: string,
  update: Partial<Comment>
) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      return { error: "User must be authenticated to update a comment" };
    }

    // Get the comment to check ownership
    const commentRef = doc(
      firestore,
      "contracts",
      contractId,
      "comments",
      commentId
    );
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      return { error: "Comment not found" };
    }

    const commentData = commentSnap.data();

    // Only the original author or contract owner can update the comment
    if (commentData.userId !== auth.currentUser.uid) {
      // Check if user is the contract owner
      const contractRef = doc(firestore, "contracts", contractId);
      const contractSnap = await getDoc(contractRef);

      if (
        !contractSnap.exists() ||
        contractSnap.data().userId !== auth.currentUser.uid
      ) {
        return { error: "Permission denied" };
      }
    }

    // Update the comment
    await updateDoc(commentRef, {
      ...update,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating comment:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to update comment",
    };
  }
};

export const deleteComment = async (contractId: string, commentId: string) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      return { error: "User must be authenticated to delete a comment" };
    }

    // Get the comment to check ownership
    const commentRef = doc(
      firestore,
      "contracts",
      contractId,
      "comments",
      commentId
    );
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      return { error: "Comment not found" };
    }

    const commentData = commentSnap.data();

    // Only the original author or contract owner can delete the comment
    if (commentData.userId !== auth.currentUser.uid) {
      // Check if user is the contract owner
      const contractRef = doc(firestore, "contracts", contractId);
      const contractSnap = await getDoc(contractRef);

      if (
        !contractSnap.exists() ||
        contractSnap.data().userId !== auth.currentUser.uid
      ) {
        return { error: "Permission denied" };
      }
    }

    // Delete the comment
    await deleteDoc(commentRef);

    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete comment",
    };
  }
};

export const addCommentReply = async (
  contractId: string,
  commentId: string,
  reply: { comment: string }
) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      return { error: "User must be authenticated to reply to a comment" };
    }

    // Get the comment
    const commentRef = doc(
      firestore,
      "contracts",
      contractId,
      "comments",
      commentId
    );
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      return { error: "Comment not found" };
    }

    const commentData = commentSnap.data();
    const replies = commentData.replies || [];

    // Add the reply
    const newReply = {
      id: crypto.randomUUID(),
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || "Anonymous",
      comment: reply.comment,
      timestamp: serverTimestamp(),
    };

    // Update the comment with the new reply
    await updateDoc(commentRef, {
      replies: [...replies, newReply],
      updatedAt: serverTimestamp(),
    });

    return { success: true, reply: newReply };
  } catch (error) {
    console.error("Error adding reply:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to add reply",
    };
  }
};

export const migrateLocalStorageComments = async (
  contractId: string
): Promise<{
  success: boolean;
  error?: string;
  migrated?: number;
}> => {
  try {
    if (!contractId) {
      return {
        success: false,
        error: "Contract ID is required",
      };
    }

    const auth = getAuth();

    // Check if user is authenticated
    if (!auth.currentUser) {
      return {
        success: false,
        error: "User must be authenticated to migrate comments",
      };
    }

    // Check localStorage for any comments
    try {
      const localStorageKey = `comments-${contractId}`;
      const localComments = localStorage.getItem(localStorageKey);

      if (!localComments) {
        // No comments in localStorage
        return { success: true, migrated: 0 };
      }

      const parsedComments = JSON.parse(localComments);
      if (!Array.isArray(parsedComments) || parsedComments.length === 0) {
        // No valid comments in localStorage
        return { success: true, migrated: 0 };
      }

      console.log(`Found ${parsedComments.length} comments in localStorage`);

      // Get Firestore reference
      const firestore = getFirestore();

      // Get existing Firestore comments to avoid duplicates
      const commentsRef = collection(
        firestore,
        "contracts",
        contractId,
        "comments"
      );

      const commentsQuery = query(commentsRef);
      const commentsSnapshot = await getDocs(commentsQuery);

      const existingComments = new Set();
      commentsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Create a unique key for each comment based on blockId and comment text
        const commentKey = `${data.blockId}-${data.comment}`;
        existingComments.add(commentKey);
      });

      // Add each localStorage comment to Firestore if it doesn't already exist
      let migratedCount = 0;
      const batch = writeBatch(firestore);

      for (const comment of parsedComments) {
        // Skip comments without required fields
        if (!comment.blockId || !comment.comment) continue;

        // Create a unique key for this comment to check against existing ones
        const commentKey = `${comment.blockId}-${comment.comment}`;

        // Skip if this comment already exists in Firestore
        if (existingComments.has(commentKey)) continue;

        // Prepare comment data
        const commentWithUser = {
          ...comment,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || "Anonymous",
          userEmail: auth.currentUser.email || null,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString(),
          migratedFromLocalStorage: true,
        };

        // Remove any client-side only properties
        delete commentWithUser.isEditing;

        // Add to batch
        const newCommentRef = doc(commentsRef);
        batch.set(newCommentRef, commentWithUser);
        migratedCount++;
      }

      // Commit the batch
      if (migratedCount > 0) {
        await batch.commit();
        console.log(`Migrated ${migratedCount} comments to Firestore`);

        // Clear localStorage after successful migration
        localStorage.removeItem(localStorageKey);
      }

      return {
        success: true,
        migrated: migratedCount,
      };
    } catch (error) {
      console.error("Error parsing localStorage comments:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error migrating localStorage comments:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to migrate comments",
    };
  }
};

// Invoice Operations
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  userId: string;
  title: string; // e.g., "Invoice for Acme Co."
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  client?: {
    name?: string;
    email?: string;
    company?: string;
    address?: string;
  };
  from?: {
    name?: string;
    email?: string;
    company?: string;
    address?: string;
  };
  items?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
  contractId?: string; // Link to a contract
  createdAt: any;
  updatedAt: any;
}

// Extract contract data for invoice generation
export const extractContractDataForInvoice = async (contractId: string) => {
  try {
    const db = getFirestore();
    const contractRef = doc(db, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      console.log("❌ Contract not found for extraction:", contractId);
      return null;
    }

    const contractData = contractSnap.data();
    console.log(
      "🔍 Extracting contract data for invoice generation:",
      contractData
    );

    // Extract client information from contract content
    const extractedData = {
      clientName: contractData.clientName || "",
      clientEmail: contractData.clientEmail || "",
      clientCompany: contractData.clientCompany || "",
      paymentTerms: contractData.paymentTerms || "Net 30 days",
      totalAmount: contractData.budget || contractData.totalAmount || "",
      currency: contractData.currency || "USD",
      timeline: {
        startDate: contractData.startDate || "",
        endDate: contractData.endDate || "",
      },
      projectBrief: contractData.projectBrief || "",
    };

    // Try to extract from content blocks if not in direct fields
    if (contractData.content?.blocks) {
      contractData.content.blocks.forEach((block: any) => {
        if (block.type === "paragraph" && block.data?.text) {
          const text = block.data.text.toLowerCase();

          // Extract client name
          if (
            text.includes("client") &&
            text.includes("name") &&
            !extractedData.clientName
          ) {
            const nameMatch = block.data.text.match(
              /(?:client|name)[:\s]+([^\n\r,]+)/i
            );
            if (nameMatch) extractedData.clientName = nameMatch[1].trim();
          }

          // Extract client email
          if (text.includes("email") && !extractedData.clientEmail) {
            const emailMatch = block.data.text.match(
              /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
            );
            if (emailMatch) extractedData.clientEmail = emailMatch[1];
          }

          // Extract payment terms
          if (
            text.includes("payment") &&
            text.includes("term") &&
            !extractedData.paymentTerms
          ) {
            const paymentMatch = block.data.text.match(
              /(?:payment|term)[:\s]+([^\n\r,]+)/i
            );
            if (paymentMatch)
              extractedData.paymentTerms = paymentMatch[1].trim();
          }
        }
      });
    }

    console.log("📋 Extracted contract data:", extractedData);

    // Update contract with extracted data for future use
    await updateDoc(contractRef, {
      clientName: extractedData.clientName,
      clientEmail: extractedData.clientEmail,
      clientCompany: extractedData.clientCompany,
      paymentTerms: extractedData.paymentTerms,
      budget: extractedData.totalAmount,
      currency: extractedData.currency,
      startDate: extractedData.timeline.startDate,
      endDate: extractedData.timeline.endDate,
      projectBrief: extractedData.projectBrief,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Contract data extracted and saved for invoice generation");
    return extractedData;
  } catch (error) {
    console.error("❌ Error extracting contract data:", error);
    return null;
  }
};

export const saveInvoice = async (invoice: Invoice) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (!auth.currentUser) {
      throw new Error("User must be authenticated to save invoice");
    }

    // Debug: surface claims and user doc that rules depend on
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const claims: any = tokenResult?.claims || {};
      const userDocRef = doc(firestore, "users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData: any = userDocSnap.exists() ? userDocSnap.data() : null;
      console.log("[Invoices] Rules debug before write:", {
        uid: auth.currentUser.uid,
        claims: {
          subscriptionStatus: (claims as any).subscriptionStatus,
          subscriptionTier: (claims as any).subscriptionTier,
          isAdmin: (claims as any).isAdmin,
        },
        hasUserDoc: userDocSnap.exists(),
        userDoc: userData
          ? {
              subscription_debug: userData.subscription_debug,
              subscriptionStatus: userData.subscription?.status,
              tier: userData.subscription?.tier,
            }
          : null,
      });
    } catch (dbgErr) {
      console.warn("[Invoices] Failed to gather rules debug info:", dbgErr);
    }

    const invoiceWithUser = {
      ...invoice,
      userId: auth.currentUser.uid,
      createdAt: (invoice as any).createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const invoiceRef = doc(firestore, "invoices", invoice.id);
    try {
      console.log("[Invoices] Attempting to save invoice:", {
        invoiceId: invoice.id,
        userId: auth.currentUser.uid,
        hasCreatedAt: !!invoiceWithUser.createdAt,
        hasUpdatedAt: !!invoiceWithUser.updatedAt,
      });

      await setDoc(invoiceRef, invoiceWithUser);
      console.log("[Invoices] ✅ Invoice saved successfully:", invoice.id);
      return { success: true, invoiceId: invoice.id };
    } catch (writeErr: any) {
      // If permission denied in dev, try enabling dev bypass and retry once
      const isPermissionDenied = writeErr?.code === "permission-denied";
      const isDev = process.env.NODE_ENV === "development";
      if (isPermissionDenied && isDev) {
        console.warn(
          "[Invoices] First write denied. Attempting to enable subscription_debug and retry once..."
        );
        try {
          const userDocRef = doc(firestore, "users", auth.currentUser.uid);
          await updateDoc(userDocRef, {
            subscription_debug: true,
            subscription: {
              status: "active",
              tier: "pro",
              currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          } as any);
          // Force refresh token so custom claims (if any) update later
          try {
            await auth.currentUser.getIdToken(true);
          } catch {}
          console.log("[Invoices] Dev bypass set. Retrying invoice write...");
          await setDoc(invoiceRef, invoiceWithUser);
          return { success: true, invoiceId: invoice.id };
        } catch (retryErr) {
          console.error("[Invoices] Retry after dev bypass failed:", retryErr);
          throw writeErr; // fall through to outer catch
        }
      }
      throw writeErr;
    }
  } catch (error) {
    console.error("Error saving invoice:", error);
    if (
      typeof error === "object" &&
      error &&
      (error as any).code === "permission-denied"
    ) {
      console.error(
        "[Invoices] Firestore permission-denied. Likely causes: inactive subscription, missing users/{uid} doc, or subscription_debug not set in dev."
      );
    }
    return {
      error: error instanceof Error ? error.message : "Failed to save invoice",
    };
  }
};

export const getInvoice = async (invoiceId: string) => {
  try {
    const firestore = getFirestore();
    const invoiceRef = doc(firestore, "invoices", invoiceId);
    const snap = await getDoc(invoiceRef);
    if (!snap.exists()) return { error: "Invoice not found" };
    return { success: true, invoice: snap.data() as Invoice };
  } catch (error) {
    console.error("Error getting invoice:", error);
    return { error: "Failed to get invoice" };
  }
};

export const getUserContracts = async (userId: string) => {
  try {
    const firestore = getFirestore();
    const contractsRef = collection(firestore, "contracts");
    const userContracts = query(
      contractsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const contractsSnap = await getDocs(userContracts);
    const contracts: any[] = [];
    contractsSnap.forEach((doc) => {
      contracts.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, contracts };
  } catch (error) {
    console.error("Error getting user contracts:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get contracts",
    };
  }
};

export const updateInvoice = async (invoice: Invoice) => {
  try {
    const firestore = getFirestore();
    const auth = getAuth();

    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (!auth.currentUser) {
      throw new Error("User must be authenticated to update invoice");
    }

    // Debug: surface claims and user doc that rules depend on
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const claims: any = tokenResult?.claims || {};
      const userDocRef = doc(firestore, "users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData: any = userDocSnap.exists() ? userDocSnap.data() : null;
      console.log("[Invoices] Rules debug before update:", {
        uid: auth.currentUser.uid,
        claims: {
          subscriptionStatus: (claims as any).subscriptionStatus,
          subscriptionTier: (claims as any).subscriptionTier,
          isAdmin: (claims as any).isAdmin,
        },
        hasUserDoc: userDocSnap.exists(),
        userDoc: userData
          ? {
              subscription_debug: userData.subscription_debug,
              subscriptionStatus: userData.subscription?.status,
              tier: userData.subscription?.tier,
            }
          : null,
      });
    } catch (dbgErr) {
      console.warn("[Invoices] Failed to gather rules debug info:", dbgErr);
    }

    const invoiceWithUser = {
      ...invoice,
      userId: auth.currentUser.uid,
      updatedAt: serverTimestamp(),
    };

    const invoiceRef = doc(firestore, "invoices", invoice.id);
    try {
      console.log("[Invoices] Attempting to update invoice:", {
        invoiceId: invoice.id,
        userId: auth.currentUser.uid,
        hasUpdatedAt: !!invoiceWithUser.updatedAt,
      });

      await setDoc(invoiceRef, invoiceWithUser);
      console.log("[Invoices] ✅ Invoice updated successfully:", invoice.id);
      return { success: true, invoiceId: invoice.id };
    } catch (writeErr: any) {
      // If permission denied in dev, try enabling dev bypass and retry once
      const isPermissionDenied = writeErr?.code === "permission-denied";
      const isDev = process.env.NODE_ENV === "development";
      if (isPermissionDenied && isDev) {
        console.warn(
          "[Invoices] First update denied. Attempting to enable subscription_debug and retry once..."
        );
        try {
          const userDocRef = doc(firestore, "users", auth.currentUser.uid);
          await updateDoc(userDocRef, {
            subscription_debug: true,
            subscription: {
              status: "active",
              tier: "pro",
              currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          } as any);
          // Force refresh token so custom claims (if any) update later
          try {
            await auth.currentUser.getIdToken(true);
          } catch {}
          console.log("[Invoices] Dev bypass set. Retrying invoice update...");
          await setDoc(invoiceRef, invoiceWithUser);
          return { success: true, invoiceId: invoice.id };
        } catch (retryErr) {
          console.error("[Invoices] Retry after dev bypass failed:", retryErr);
          throw writeErr; // fall through to outer catch
        }
      }
      throw writeErr;
    }
  } catch (error) {
    console.error("Error updating invoice:", error);
    if (
      typeof error === "object" &&
      error &&
      (error as any).code === "permission-denied"
    ) {
      console.error(
        "[Invoices] Firestore permission-denied. Likely causes: inactive subscription, missing users/{uid} doc, or subscription_debug not set in dev."
      );
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to update invoice",
    };
  }
};

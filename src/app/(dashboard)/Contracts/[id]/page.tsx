"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContractEditor } from "@/app/Components/Editor/ContractEditor";
import Skeleton from "@/app/Components/Editor/skeleton";
import {
  getContract,
  getSignatures,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  addCommentReply,
  saveInvoice,
} from "@/lib/firebase/firestore";
import { toast } from "react-hot-toast";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import Button from "@/app/Components/button";
import {
  CommentBox,
  CommentList,
  CommentOverlay,
} from "@/app/Components/Comment";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

// Override toast.error to filter out "Comment not found" errors but log more details
const originalToastError = toast.error;
toast.error = (message: any, ...args: any[]) => {
  // Skip displaying "Comment not found" errors but log them in detail
  if (typeof message === "string" && message.includes("Comment not found")) {
    console.log(
      "🔴 INTERCEPTED ERROR: 'Comment not found' error was caught by toast interceptor"
    );
    console.log("🔴 Error details:", { message, args });
    console.log("🔴 Error stack trace:", new Error().stack);
    return "";
  }
  return originalToastError(message, ...args);
};

interface ContractState {
  isClientSigned: boolean;
  existingSignature: boolean;
  clientName: string;
  clientSignature: string;
  clientSignedAt: Date | null;
  designerName: string;
  designerSignature: string;
  designerSignedAt: Date | null;
}

interface Contract {
  id: string;
  userId: string;
  title: string;
  content: any; // EditorJS data
  status: "draft" | "pending" | "signed";
  createdAt: any;
  updatedAt: any;
  version: number;
  previousVersions?: Array<{
    content: any;
    updatedAt: string;
    version: number;
  }>;
  // Additional fields we want to ensure are available
  formData?: any;
  generatedContent?: any;
  signatures?: Partial<ContractState>;
}

interface ContractResponse {
  success: boolean;
  contract: Contract;
  error?: string;
}

interface Comment {
  id?: string;
  contractId: string;
  userId: string;
  userName?: string;
  userEmail?: string | null;
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
    scrollX?: number;
    scrollY?: number;
    zIndex: number;
  };
}

type Stage = "edit" | "sign" | "send";

// Add this initialization function at the beginning of the component
const initializeCommentHandling = () => {
  // Safety check to prevent "comment not found" errors
  if (typeof window !== "undefined") {
    const hideErrorMessages = () => {
      try {
        const errorElements = document.querySelectorAll(
          '[class*="comment-not-found"], [class*="comment_error"], [class*="error"]'
        );

        if (errorElements.length > 0) {
          console.log(
            `🔍 Found ${errorElements.length} potential error elements in DOM`
          );
        }

        errorElements.forEach((element) => {
          if (
            element.textContent?.toLowerCase().includes("comment not found") ||
            element.textContent?.toLowerCase().includes("error")
          ) {
            const htmlElement = element as HTMLElement;
            console.log("🚫 Hiding error element:", {
              textContent: htmlElement.textContent,
              className: htmlElement.className,
            });
            htmlElement.style.display = "none";
            htmlElement.style.visibility = "hidden";
            htmlElement.style.height = "0";
            htmlElement.style.opacity = "0";
            htmlElement.style.overflow = "hidden";
            htmlElement.setAttribute("aria-hidden", "true");
          }
        });
      } catch (error) {
        console.error("🔴 Error in hideErrorMessages:", error);
      }
    };

    // Run immediately
    hideErrorMessages();

    // Set up a more aggressive observer
    const observer = new MutationObserver((mutations) => {
      // Disable DOM mutation console logs - they're too noisy
      // console.log(`🔄 DOM mutation detected: ${mutations.length} changes`);
      hideErrorMessages();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Also run on regular intervals for extra safety
    const interval = setInterval(() => {
      hideErrorMessages();
    }, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }
};

// Add this for debugging - set to false to hide debug buttons
const SHOW_DEBUG_BUTTONS = false;

// Add a flag to disable comments functionality
const COMMENTS_ENABLED = false;

export default function ContractPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [formData, setFormData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`contract-form-${id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [generatedContent, setGeneratedContent] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`contract-content-${id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [stage, setStage] = useState<Stage>("edit");
  const [contractState, setContractState] = useState<ContractState>({
    isClientSigned: false,
    existingSignature: false,
    clientName: "",
    clientSignature: "",
    clientSignedAt: null,
    designerName: "",
    designerSignature: "",
    designerSignedAt: null,
  });
  const hasInitialized = useRef(false);
  const lastForceRefreshTime = useRef(Date.now());

  // Remove force-refresh to avoid redundant network + re-renders
  // Signatures will be fetched in background after initial content render

  // Comment functionality
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Initialize stage from localStorage if it exists
  const [currentStage, setCurrentStage] = useState<"edit" | "sign" | "send">(
    () => {
      const savedStage = localStorage.getItem(`contract-stage-${id}`);
      return (savedStage as "edit" | "sign" | "send") || "edit";
    }
  );

  // Initialize comment error handling
  useEffect(() => {
    const cleanup = initializeCommentHandling();
    return cleanup;
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
      } else {
      }
      setUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleGenerateInvoice = async () => {
    try {
      if (!id) return;
      const auth = getAuth();
      if (!auth.currentUser) {
        toast.error("You must be signed in to generate an invoice");
        return;
      }

      // Build minimal payload for invoice generation
      const projectBrief =
        formData?.projectBrief ||
        (Array.isArray(generatedContent?.blocks)
          ? generatedContent.blocks.find((b: any) => b?.data?.text)?.data
              ?.text || ""
          : "");

      const fileSummaries = formData?.fileSummaries || {};
      const attachments = Object.keys(fileSummaries).map((name) => ({
        name,
        summary: fileSummaries[name],
      }));

      const loadingToast = toast.loading("Generating invoice...");
      setIsGeneratingInvoice(true);

      const response = await fetch("/api/generateInvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectBrief,
          attachments,
          currency: "USD",
          debug: process.env.NODE_ENV === "development",
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        toast.error(data?.error || "Failed to generate invoice", {
          id: loadingToast,
        });
        return;
      }

      if (!Array.isArray(data.items) || data.items.length === 0) {
        toast.error("No invoice items generated", { id: loadingToast });
        return;
      }

      // Prepare invoice document
      const subtotal = data.items.reduce(
        (sum: number, item: any) => sum + (Number(item.total) || 0),
        0
      );
      const tax = typeof data.tax === "number" ? data.tax : 0;
      const total =
        typeof data.total === "number" ? data.total : subtotal + tax;

      const firestore = getFirestore();
      const invoiceRef = doc(collection(firestore, "invoices"));
      const generatedId = invoiceRef.id;

      const invoiceData = {
        id: generatedId,
        userId: auth.currentUser.uid,
        title: data.title || "Untitled Invoice",
        status: "draft" as const,
        issueDate: data.issueDate || undefined,
        dueDate: data.dueDate || undefined,
        currency: data.currency || "USD",
        client: data.client || {},
        from: data.from || {},
        items: data.items || [],
        subtotal,
        tax,
        total,
        notes: data.notes || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saveRes = await saveInvoice(invoiceData as any);
      if ((saveRes as any)?.error) {
        toast.error((saveRes as any).error, { id: loadingToast });
        return;
      }

      toast.success("Invoice created successfully!", { id: loadingToast });
      router.push(`/Invoices/${generatedId}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Load comments when component mounts or when showComments changes
  useEffect(() => {
    if (id && showComments) {
      console.log("💬 Loading comments for contract:", id);
      loadComments();
    }
  }, [id, showComments]);

  const loadComments = async () => {
    if (!id) {
      console.log("❌ Cannot load comments: No contract ID");
      return;
    }

    console.log("🔄 Loading comments for contract:", id);
    setLoadingComments(true);

    try {
      console.log("📥 Calling getComments API...");
      const startTime = performance.now();
      let commentsResult;

      try {
        commentsResult = await getComments(id);
        const endTime = performance.now();
        console.log(
          `📊 getComments API took ${Math.round(
            endTime - startTime
          )}ms to respond`
        );
      } catch (apiError) {
        console.error("🔴 Exception in getComments API call:", apiError);
        throw apiError;
      }

      console.log(
        "📥 Raw getComments result:",
        JSON.stringify(commentsResult, null, 2)
      );

      if (commentsResult.success) {
        const commentsData = commentsResult.comments || [];
        console.log("✅ Successfully loaded", commentsData.length, "comments");

        // Debug each comment structure
        commentsData.forEach((comment, index) => {
          console.log(`📝 Comment ${index + 1}/${commentsData.length}:`, {
            id: comment.id,
            blockId: comment.blockId,
            comment:
              comment.comment?.substring(0, 20) +
              (comment.comment?.length > 20 ? "..." : ""),
            isDismissed: comment.isDismissed,
            hasReplies:
              Array.isArray(comment.replies) && comment.replies.length > 0,
            replyCount: Array.isArray(comment.replies)
              ? comment.replies.length
              : 0,
          });
        });

        setComments(commentsData);
        setCommentsError(null);
      } else {
        console.error("❌ Error loading comments:", commentsResult.error);
        setComments([]);
        setCommentsError(commentsResult.error || "Unknown error");

        if (
          !commentsResult.error?.includes("Missing or insufficient permissions")
        ) {
          console.error("Error details:", commentsResult);
        }
      }
    } catch (error) {
      console.error("❌ Exception loading comments:", error);
      console.error(
        "Stack trace:",
        error instanceof Error ? error.stack : "No stack trace available"
      );
      setComments([]);
      setCommentsError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingComments(false);
      console.log("🔄 Finished loading comments");
    }
  };

  const handleAddComment = (blockId: string, comment: string) => {
    setComments((prev) =>
      prev.map((c) => (c.blockId === blockId ? { ...c, comment } : c))
    );
  };

  // Simplified comment submission for general comments
  const handleSubmitComment = async (blockId: string) => {
    try {
      console.log("🔹 Submit comment initiated for blockId:", blockId);
      const commentToSubmit = comments.find((c) => c.blockId === blockId);

      console.log("🔹 Comment to submit:", commentToSubmit);

      if (!commentToSubmit || !commentToSubmit.comment.trim()) {
        console.log("⛔ Cannot submit comment: empty or not found");
        return;
      }

      // Check auth status and sign in anonymously if needed
      const auth = getAuth();
      console.log("🔐 Current auth status:", {
        isAuthenticated: !!auth.currentUser,
        userId: auth.currentUser?.uid || "none",
        isAnonymous: auth.currentUser?.isAnonymous,
      });

      if (!auth.currentUser) {
        toast.loading("Signing in anonymously to save comment...");
        try {
          console.log("🔐 Attempting anonymous sign-in for comment...");
          const credential = await signInAnonymously(auth);
          console.log("🔐 Anonymous sign-in successful:", {
            uid: credential.user.uid,
            isAnonymous: credential.user.isAnonymous,
          });
          toast.dismiss();
          toast.success("Signed in anonymously");
        } catch (authError: any) {
          toast.dismiss();
          console.error("🔐 Anonymous sign-in failed:", {
            error: authError,
            code: authError.code,
            message: authError.message,
          });
          toast.error("Failed to authenticate: " + authError.message);
          return;
        }
      } else {
        console.log("🔐 Already authenticated as:", {
          uid: auth.currentUser.uid,
          isAnonymous: auth.currentUser.isAnonymous,
          email: auth.currentUser.email,
        });
      }

      // For simplicity, we'll always add as a new comment
      toast.loading("Adding comment...");
      console.log("➕ Adding new comment for blockId:", blockId);

      try {
        // Get Firestore
        const firestore = getFirestore();
        console.log("🔌 Got Firestore reference");

        // Create the comment data with current user info
        const commentData = {
          contractId: id,
          blockId: blockId,
          blockContent: commentToSubmit.blockContent,
          comment: commentToSubmit.comment,
          userId: auth.currentUser?.uid || "",
          userName: auth.currentUser?.displayName || "Anonymous",
          userEmail: auth.currentUser?.email,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString(),
          replies: [],
        };

        console.log("📝 Prepared comment data:", commentData);

        // Get reference to the comments collection
        const commentsRef = collection(firestore, "contracts", id, "comments");

        console.log(
          "🗂️ Got comments collection reference, path:",
          `contracts/${id}/comments`
        );

        // Add document directly to Firestore
        console.log("➕ Adding comment directly to Firestore...");
        const docRef = await addDoc(commentsRef, commentData);
        console.log("✅ Comment added successfully with ID:", docRef.id);

        toast.dismiss();
        console.log("🔄 Refreshing comments list...");

        // Update UI immediately without waiting for refresh
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentToSubmit.id) {
              return {
                ...commentToSubmit,
                id: docRef.id,
                isEditing: false,
                timestamp: new Date(),
                userId: auth.currentUser?.uid || "",
              };
            }
            return c;
          })
        );

        // Then refresh from server
        await loadComments();
        toast.success("Comment added");
      } catch (error) {
        const errorDetails = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: error?.constructor?.name,
        };
        console.error("🔴 Error directly adding comment to Firestore:", error);
        console.error("🔴 Error details:", errorDetails);

        toast.dismiss();
        toast.error("Failed to add comment: " + errorDetails.message);
      }
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error?.constructor?.name,
      };

      toast.dismiss();
      console.error("🔴 Top-level error in handleSubmitComment:", error);
      console.error("🔴 Error details:", errorDetails);
      toast.error("Failed to submit comment: " + errorDetails.message);
    }
  };

  const handleEditComment = (blockId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.blockId === blockId ? { ...c, isEditing: true } : c))
    );
  };

  const handleDismissComment = async (commentId: string) => {
    try {
      toast.loading("Dismissing comment...");

      // Get Firestore and comment reference
      const firestore = getFirestore();
      const commentRef = doc(firestore, "contracts", id, "comments", commentId);

      // Update the comment directly
      await updateDoc(commentRef, {
        isDismissed: true,
        updatedAt: serverTimestamp(),
      });

      toast.dismiss();
      await loadComments(); // Refresh comments
      toast.success("Comment dismissed");
    } catch (error) {
      toast.dismiss();
      console.error("Error dismissing comment:", error);
      toast.error(
        "Failed to dismiss comment: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleRestoreComment = async (commentId: string) => {
    try {
      toast.loading("Restoring comment...");

      // Get Firestore and comment reference
      const firestore = getFirestore();
      const commentRef = doc(firestore, "contracts", id, "comments", commentId);

      // Update the comment directly
      await updateDoc(commentRef, {
        isDismissed: false,
        updatedAt: serverTimestamp(),
      });

      toast.dismiss();
      await loadComments(); // Refresh comments
      toast.success("Comment restored");
    } catch (error) {
      toast.dismiss();
      console.error("Error restoring comment:", error);
      toast.error(
        "Failed to restore comment: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleAddCommentAtPosition = (position: {
    x: number;
    y: number;
    offsetX?: number;
    offsetY?: number;
  }) => {
    console.log("➕ Adding a comment at position:", position);

    // Get document content area position for absolute positioning
    const contentContainer = document.querySelector(".ce-block");
    let contentRect: DOMRect | undefined;

    if (contentContainer) {
      contentRect = contentContainer.getBoundingClientRect();
      console.log("📏 Content container position:", {
        top: contentRect.top,
        left: contentRect.left,
        bottom: contentRect.bottom,
        right: contentRect.right,
        width: contentRect.width,
        height: contentRect.height,
      });
    }

    // Use the click coordinates for positioning
    // We store both clientX/Y (viewport relative) and the scroll offsets
    // This gives us much more robust positioning
    const absolutePosition = {
      x: position.x,
      y: position.y,
      scrollX: position.offsetX || 0,
      scrollY: position.offsetY || 0,
    };

    console.log("📄 Current comments state:", {
      count: comments.length,
      showingComments: showComments,
      editing: comments.some((c) => c.isEditing),
    });

    // Create a new comment with position data
    const commentId = crypto.randomUUID();
    const newComment = {
      id: commentId,
      contractId: id,
      blockId: "positioned-comment-" + Date.now(),
      blockContent: "Comment at position",
      comment: "",
      timestamp: Date.now(),
      isEditing: true,
      replies: [],
      userId: "", // Will be set by the server
      position: {
        x: absolutePosition.x,
        y: absolutePosition.y,
        scrollX: absolutePosition.scrollX,
        scrollY: absolutePosition.scrollY,
        zIndex: 100,
      },
    };

    console.log("✨ Created new comment with position:", {
      id: newComment.id,
      position: newComment.position,
    });

    setComments((prev) => {
      const updatedComments = [
        ...prev.map((c) => ({ ...c, isEditing: false })),
        newComment,
      ];
      console.log("📊 Updated comments state:", {
        newCount: updatedComments.length,
        editing: newComment.id,
        position: newComment.position,
      });
      return updatedComments;
    });
  };

  const handleAddReply = async (commentId: string, replyText: string) => {
    try {
      // Don't proceed if reply is empty
      if (!replyText.trim()) {
        return;
      }

      toast.loading("Adding reply...");

      // Get Firestore
      const firestore = getFirestore();
      const auth = getAuth();

      if (!auth.currentUser) {
        toast.dismiss();
        toast.error("You must be signed in to add replies");
        return;
      }

      // Get the comment reference
      const commentRef = doc(firestore, "contracts", id, "comments", commentId);

      // Get current comment data to append the reply
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        toast.dismiss();
        toast.error("Comment not found");
        return;
      }

      const commentData = commentSnap.data();
      const replies = commentData.replies || [];

      // Create the new reply
      const newReply = {
        id: crypto.randomUUID(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "Anonymous",
        comment: replyText,
        timestamp: serverTimestamp(),
      };

      // Update the comment with the new reply
      await updateDoc(commentRef, {
        replies: [...replies, newReply],
        updatedAt: serverTimestamp(),
      });

      toast.dismiss();
      await loadComments(); // Refresh comments
      toast.success("Reply added");
    } catch (error) {
      toast.dismiss();
      console.error("Error adding reply:", error);
      toast.error(
        "Failed to add reply: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleStageChange = (newStage: "edit" | "sign" | "send") => {
    console.log("🔄 Stage change requested:", newStage);
    console.log("📍 Current stage:", currentStage);

    // Get current signature status
    const clientSig = localStorage.getItem(`contract-client-signature-${id}`);
    const designerSig = localStorage.getItem(
      `contract-designer-signature-${id}`
    );
    const hasSignatures = !!(clientSig || designerSig);
    console.log("📝 Current signatures:", {
      hasSignatures,
      clientSig,
      designerSig,
    });

    // Set new stage
    console.log("✅ Setting stage to:", newStage);
    setCurrentStage(newStage);
    localStorage.setItem(`contract-stage-${id}`, newStage);
  };

  // Stage change event listener
  useEffect(() => {
    const handleStageChangeEvent = (e: CustomEvent) => {
      // Handle confirmed edit case
      if (e.detail?.stage === "edit" && e.detail?.confirmed) {
        setCurrentStage("edit");
        localStorage.setItem(`contract-stage-${id}`, "edit");
        return;
      }

      // Handle normal stage changes
      if (typeof e.detail === "string") {
        const newStage = e.detail as Stage;
        setCurrentStage(newStage);
        localStorage.setItem(`contract-stage-${id}`, newStage);
      }
    };

    window.addEventListener(
      "stageChange",
      handleStageChangeEvent as EventListener
    );
    return () => {
      window.removeEventListener(
        "stageChange",
        handleStageChangeEvent as EventListener
      );
    };
  }, [id]);

  // Listen for signature state changes
  useEffect(() => {
    const handleSignatureStateChanged = (e: CustomEvent) => {
      const detail = e.detail || {};

      // Only process if the event is for this contract
      if (detail.contractId === id) {
        console.log(
          "📝 ContractPage: Signature state changed event received",
          detail
        );

        // Update our internal contract state
        setContractState((prevState) => ({
          ...prevState,
          existingSignature: detail.hasDesignerSignature || false,
          designerSignature: detail.hasDesignerSignature
            ? prevState.designerSignature
            : "",
        }));

        // If signatures were removed and we're not in edit mode, force edit mode
        if (!detail.hasDesignerSignature && currentStage !== "edit") {
          console.log(
            "🔄 ContractPage: Forcing edit mode after signature removal"
          );
          setCurrentStage("edit");
          localStorage.setItem(`contract-stage-${id}`, "edit");

          // Also update the stage state to ensure UI consistency
          setStage("edit");
        }

        // Force reload signatures from Firestore to ensure state consistency
        loadContract();
      }
    };

    window.addEventListener(
      "signatureStateChanged",
      handleSignatureStateChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "signatureStateChanged",
        handleSignatureStateChanged as EventListener
      );
    };
  }, [id, currentStage]);

  // Update the safety check for signatures to better handle direct URL navigation
  useEffect(() => {
    const checkSignatures = async () => {
      // Always check fresh signature status from Firestore
      try {
        const result = await getSignatures(id);
        const hasDesignerSignature = !!result.signatures?.designer;
        const hasClientSignature = !!result.signatures?.client;

        // Check if this was an explicit edit button click
        const editButtonClicked =
          localStorage.getItem("explicit-edit-click") === "true";

        // Update our local state first
        setContractState((prev) => ({
          ...prev,
          existingSignature: hasDesignerSignature,
          isClientSigned: hasClientSignature,
          designerSignature: result.signatures?.designer?.signature || "",
          designerName: result.signatures?.designer?.name || "",
          designerSignedAt: result.signatures?.designer?.signedAt
            ? new Date(result.signatures.designer.signedAt)
            : null,
          clientSignature: result.signatures?.client?.signature || "",
          clientName: result.signatures?.client?.name || "",
          clientSignedAt: result.signatures?.client?.signedAt
            ? new Date(result.signatures.client.signedAt)
            : null,
        }));

        // Case 1: Explicit edit click with designer signature
        // This should have triggered the unsign modal in ContractEditor already
        if (
          editButtonClicked &&
          hasDesignerSignature &&
          currentStage === "edit"
        ) {
          console.log(
            "📝 Explicit edit button click detected with designer signature"
          );

          // In this case, don't automatically switch to edit mode
          // The modal in ContractEditor will handle the workflow

          // Just clear the flag since we've processed the click
          localStorage.removeItem("explicit-edit-click");
        }
        // Case 2: Explicit edit click without designer signature
        else if (
          editButtonClicked &&
          !hasDesignerSignature &&
          currentStage === "edit"
        ) {
          console.log(
            "📝 Explicit edit button click detected, allowing edit mode"
          );

          // Update UI to show contract can now be edited
          const eventDetail = {
            stage: "edit",
            confirmed: true,
            allowWithSignatures: true,
          };
          const event = new CustomEvent("stageChange", { detail: eventDetail });
          window.dispatchEvent(event);

          // Clear the flag after processing
          localStorage.removeItem("explicit-edit-click");
        }
        // Case 3: User currently in edit mode with designer signature, but no explicit click
        // This could happen during initial load or URL navigation
        else if (
          hasDesignerSignature &&
          currentStage === "edit" &&
          !editButtonClicked
        ) {
          console.log(
            "📝 Designer signature present, but allowing view in edit stage"
          );

          // Previously we redirected to sign stage, but now we want to allow viewing in edit mode
          // but ensure the editor remains locked. This is handled by ContractEditor component's
          // stage management useEffect.

          // Update local storage with the current stage
          localStorage.setItem(`contract-stage-${id}`, "edit");
        }
        // Case 4: Only client signature exists, still allow edit mode
        else if (
          hasClientSignature &&
          !hasDesignerSignature &&
          currentStage === "edit"
        ) {
          console.log("📝 Only client signature present, allowing edit mode");

          // Update local storage with the current stage
          localStorage.setItem(`contract-stage-${id}`, "edit");
        }
      } catch (error) {
        console.error("❌ Error checking signatures:", error);
      }
    };

    checkSignatures();
  }, [currentStage, id]);

  const loadContract = async () => {
    try {
      const response = await getContract(id);
      if (response?.success && response?.contract) {
        // Extract form data and generated content from the contract
        const contract = response.contract;
        setFormData(contract.content?.formData || null);
        setGeneratedContent(contract.content || null);
        // Defer signature fetch to background
        getSignatures(id)
          .then((signaturesResult) => {
            if (signaturesResult.success) {
              const { designer, client } = signaturesResult.signatures;
              setContractState((prevState) => ({
                ...prevState,
                isClientSigned: !!client,
                existingSignature: !!designer || !!client,
                clientName: client?.name || "",
                clientSignature: client?.signature || "",
                clientSignedAt: client?.signedAt
                  ? new Date(client.signedAt)
                  : null,
                designerName: designer?.name || "",
                designerSignature: designer?.signature || "",
                designerSignedAt: designer?.signedAt
                  ? new Date(designer.signedAt)
                  : null,
              }));
            }
          })
          .catch((e) => console.warn("Signature fetch failed (deferred):", e));
      } else {
        toast.error("Failed to load contract");
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading contract:", error);
      toast.error("Error loading contract");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) {
      console.log("🚫 Preventing double initialization");
      return;
    }

    loadContract();
    hasInitialized.current = true;
  }, [id]);

  // Add a debug helper for the component render
  useEffect(() => {});

  // Add debugging for component mounting
  useEffect(() => {
    // Debugging contract data on mount
    return () => {};
  }, [id]);

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  // Add custom debug function for component internals
  const debugComponentState = () => {
    console.log("🔬 COMPONENT STATE DUMP", {
      id,
      isLoading,
      formData,
      generatedContent: generatedContent ? "present" : "missing",
      stage,
      currentStage,
      contractState,
      showComments,
      comments,
      loadingComments,
      commentsError,
      user: user
        ? {
            uid: user.uid,
            isAnonymous: user.isAnonymous,
            email: user.email,
          }
        : "none",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Generate Invoice action */}
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={handleGenerateInvoice}
          disabled={isGeneratingInvoice}
          className="px-4 py-2 h-[40px] bg-black text-white rounded-md hover:bg-gray-800 transition-all duration-300 ease-in-out min-w-[140px] font-medium disabled:opacity-60"
        >
          {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
        </button>
      </div>
      {/* Debug button - only in development */}
      {process.env.NODE_ENV === "development" && SHOW_DEBUG_BUTTONS && (
        <button
          onClick={debugComponentState}
          className="fixed top-20 right-4 bg-red-500 text-white px-3 py-1 text-xs rounded z-50"
        >
          Debug
        </button>
      )}

      {/* Comment Toggle Button */}
      {COMMENTS_ENABLED && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant={showComments ? "primary" : "secondary"}
            className="inline-flex items-center gap-2"
            onClick={toggleComments}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            {showComments ? "Hide Comments" : "Show Comments"} (
            {comments.filter((c) => !c.isDismissed).length})
          </Button>
        </div>
      )}

      <ContractEditor
        formData={formData}
        initialContent={generatedContent}
        stage={currentStage}
        onStageChange={handleStageChange}
      />

      {/* Comment Overlay */}
      {COMMENTS_ENABLED && showComments && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ position: "relative" }}
        >
          <CommentOverlay
            comments={comments}
            onAddComment={(position) => {
              console.log(
                "➕ Comment add requested at position from overlay:",
                position
              );
              handleAddCommentAtPosition(position);
            }}
            onDismissComment={(commentId) => {
              console.log("❌ Comment dismiss requested for:", commentId);
              handleDismissComment(commentId);
            }}
            onEditComment={(blockId) => {
              console.log("✏️ Comment edit requested for blockId:", blockId);
              handleEditComment(blockId);
            }}
            onAddReply={(commentId, reply) => {
              console.log(
                "💬 Comment reply requested for:",
                commentId,
                "Reply:",
                reply
              );
              handleAddReply(commentId, reply);
            }}
          />
        </div>
      )}

      {/* General Comment Button - visible when comments are enabled */}
      {COMMENTS_ENABLED &&
        showComments &&
        !comments.some((c) => c.isEditing) && (
          <div className="fixed right-4 bottom-4 z-50">
            <Button
              variant="primary"
              onClick={() => {
                console.log("➕ Adding a general comment to the contract");
                // Create a general comment not tied to any specific block
                setComments((prev) => [
                  ...prev.map((c) => ({ ...c, isEditing: false })),
                  {
                    id: crypto.randomUUID(),
                    contractId: id,
                    blockId: "general-comment-" + Date.now(), // Generic ID not tied to editor blocks
                    blockContent: "General comment on contract",
                    comment: "",
                    timestamp: Date.now(),
                    isEditing: true,
                    replies: [],
                    userId: "", // Will be set by the server
                  },
                ]);
              }}
            >
              Add Comment
            </Button>
          </div>
        )}

      {/* Comments UI - Keep this part */}
      {COMMENTS_ENABLED &&
        showComments &&
        comments.some((c) => c.isEditing) &&
        (() => {
          const editingComment = comments.find((c) => c.isEditing);

          // Get the current scroll position to compare with when comment was created
          const currentScrollX =
            window.pageXOffset || document.documentElement.scrollLeft;
          const currentScrollY =
            window.pageYOffset || document.documentElement.scrollTop;

          // Calculate position adjustments based on scroll
          const commentScrollX = editingComment?.position?.scrollX || 0;
          const commentScrollY = editingComment?.position?.scrollY || 0;

          // Log detailed position information for debugging
          console.log("🎯 Rendering comment box at position:", {
            top: editingComment?.position?.y,
            left: editingComment?.position?.x,
            commentScrollPos: { x: commentScrollX, y: commentScrollY },
            currentScrollPos: { x: currentScrollX, y: currentScrollY },
            scrollDiff: {
              x: currentScrollX - commentScrollX,
              y: currentScrollY - commentScrollY,
            },
            commentDetails: editingComment,
          });

          // Check if we have valid position data
          if (!editingComment?.position?.x || !editingComment?.position?.y) {
            console.warn(
              "⚠️ Missing position data for comment:",
              editingComment?.id
            );
          }

          return (
            <div
              className="fixed z-50"
              style={{
                top: editingComment?.position?.y,
                left: editingComment?.position?.x,
                transform: "translate(-50%, -120%)",
              }}
            >
              {/* Debug marker to show the actual click position */}
              {process.env.NODE_ENV === "development" && SHOW_DEBUG_BUTTONS && (
                <div
                  className="absolute w-4 h-4 bg-red-500 rounded-full"
                  style={{
                    top: 0,
                    left: 0,
                    transform: "translate(-50%, -50%)",
                    zIndex: 9999,
                  }}
                />
              )}

              <CommentBox
                comment={editingComment?.comment || ""}
                onCommentChange={(newComment) => {
                  if (editingComment) {
                    handleAddComment(editingComment.blockId, newComment);
                  }
                }}
                onSubmit={() => {
                  if (editingComment) {
                    handleSubmitComment(editingComment.blockId);
                  }
                }}
                onCancel={() => {
                  setComments((prev) => {
                    // If it's a new comment (not yet saved), remove it
                    const editingComment = prev.find((c) => c.isEditing);
                    if (
                      editingComment &&
                      (!editingComment.id || editingComment.id.length < 10)
                    ) {
                      return prev.filter((c) => c.id !== editingComment.id);
                    }
                    // Otherwise just set isEditing to false
                    return prev.map((c) => ({ ...c, isEditing: false }));
                  });
                }}
              />
            </div>
          );
        })()}

      {/* Show current comments list */}
      {COMMENTS_ENABLED &&
        showComments &&
        !comments.some((c) => c.isEditing) &&
        comments.length > 0 && (
          <div className="fixed right-4 bottom-20 z-50 bg-white shadow-lg rounded-lg border border-gray-200 w-80 max-h-[60vh] overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Comments</h3>
              <span className="text-xs text-gray-500">
                {comments.filter((c) => !c.isDismissed).length} comments
              </span>
            </div>

            <CommentList
              comments={comments.filter((c) => !c.isEditing && !c.isDismissed)}
              onDismiss={handleDismissComment}
              onEdit={handleEditComment}
              onAddReply={handleAddReply}
            />
          </div>
        )}
    </div>
  );
}

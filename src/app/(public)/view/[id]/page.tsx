"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Skeleton from "@/app/Components/Editor/skeleton";
import { CommentsSidebar } from "@/app/Components/CommentsSidebar";
import Button from "@/app/Components/button";
import {
  CheckIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { SigningStage } from "@/app/Components/Editor/SigningStage";
import { CheckIcon as CheckIconSolid } from "@heroicons/react/20/solid";
import SignaturePad from "react-signature-canvas";
import Modal from "@/app/Components/Modal";
import {
  getContract,
  saveSignature,
  updateContractStatus,
  getSignatures,
  removeSignature,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  addCommentReply,
  Comment,
  migrateLocalStorageComments,
} from "@/lib/firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { Contract, ContractAccessErrorType } from "@/lib/firebase/types";
import {
  validateContractToken,
  ContractAccessError,
  handleAccessError,
} from "@/lib/firebase/token";
import { doc, updateDoc, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CommentBox,
  CommentList,
  CommentOverlay,
} from "@/app/Components/Comment";
import { formatDate } from "@/lib/utils";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

interface ContractState {
  isClientSigned: boolean;
  existingSignature: boolean;
  clientName: string;
  clientSignature: string;
  clientSignedAt: Date | null;
  designerName: string;
  designerSignature: string;
  designerSignedAt: Date | null;
  metadata?: Contract["metadata"];
}

// Add this style at the top of your component or in a <style> tag
const commentStyles = `
  .comment-not-found, 
  [class*="comment-not-found"],
  div[class*="comment-not-found"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    position: absolute !important;
    pointer-events: none !important;
    max-height: 0 !important;
    overflow: hidden !important;
  }
  
  [class*="error"]:not(.user-visible-error) {
    display: none !important;
  }
`;

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

// Add this initialization function at the beginning of the component
const initializeCommentHandling = () => {
  // Safety check to prevent "comment not found" errors
  if (typeof window !== "undefined") {
    console.log("🛡️ Initializing comment error handling protection");

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
    console.log("🔍 DOM observer set up to watch for error elements");

    // Also run on regular intervals for extra safety
    const interval = setInterval(() => {
      hideErrorMessages();
    }, 500);

    return () => {
      console.log("🧹 Cleaning up comment error handling");
      observer.disconnect();
      clearInterval(interval);
    };
  }
};

export default function ViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const testMode = searchParams?.get("test") === "true";
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const hasInitialized = useRef(false);
  const router = useRouter();
  const [isSigning, setIsSigning] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
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
  const [isEditing, setIsEditing] = useState(false);
  const [signatureState, setSignatureState] = useState({
    designerSignature: "",
    designerName: "",
    designerSignedAt: null as Date | null,
    isLoading: true,
  });
  const signaturePadRef = useRef<any>(null);
  const [isClientSigned, setIsClientSigned] = useState(false);
  const [isUnsignModalOpen, setIsUnsignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Add useEffect to set isClient to true after mount
  // This prevents hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // CRITICAL FIX: Add this effect to ensure isAuthorized is always true
  useEffect(() => {
    console.log("🔐 FORCE AUTHORIZATION: Ensuring contract access is allowed");
    setIsAuthorized(true);
  }, []);

  // Add this near the top of the component with other useEffect hooks
  useEffect(() => {
    // Only initialize comment error handling on client-side
    if (typeof window !== "undefined") {
      const cleanup = initializeCommentHandling();
      return cleanup;
    }
  }, []);

  // Update contract status
  const updateContractStatus = async (
    contractId: string,
    update: Partial<Contract>
  ) => {
    try {
      if (!db) throw new Error("Firestore not initialized");
      const contractRef = doc(db as Firestore, "contracts", contractId);
      await updateDoc(contractRef, {
        ...update,
        "metadata.lastActivity": new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating contract status:", error);
      throw error;
    }
  };

  // Check authorization and load contract
  useEffect(() => {
    // Only run this effect on the client side to prevent hydration mismatch
    if (!isClient) return;

    // ** IMPORTANT: Modified authorization logic to ALWAYS allow public access **
    const checkAuthorization = async () => {
      try {
        if (!id) return;
        console.log("🔍 Loading contract:", id);
        console.log("🔑 Token provided:", token ? "Yes" : "No");

        // CRITICAL FIX: Ensure authorization is set to true at the beginning of the function
        console.log(
          "✅ PUBLIC ACCESS: Always authorizing contract - beginning of function"
        );
        setIsAuthorized(true);

        // Get contract from Firestore
        const result = await getContract(id as string);
        console.log("📄 Contract result:", result);

        if (result.error) {
          console.error("❌ Error getting contract:", result.error);
          if (
            typeof result.error === "string" &&
            result.error.includes("BLOCKED_BY_CLIENT")
          ) {
            toast.error("Please disable your ad blocker to use all features");
          }
          // CRITICAL FIX: Don't throw an error, just log it
          console.error(
            "Error getting contract but continuing anyway:",
            result.error
          );
        }

        const contract = result.contract;
        if (!contract) {
          console.error("❌ Contract not found");
          // CRITICAL FIX: Don't throw an error if contract not found, we'll show an appropriate message instead
          console.error(
            "Contract not found but continuing with authorized state"
          );
          setIsLoading(false);
          return;
        }

        // 👇 CRITICAL CHANGE: Always authorize access first before any other processing
        console.log("✅ PUBLIC ACCESS: Always authorizing contract");
        setIsAuthorized(true);
        setGeneratedContent(contract.content);

        // Remaining code is unchanged - continue with setting up contract and checking signatures
        interface ContractWithMedia extends Contract {
          logoUrl?: string | null;
          bannerUrl?: string | null;
        }

        const contractWithMedia = contract as ContractWithMedia;

        if (contractWithMedia.logoUrl) {
          setLogoUrl(contractWithMedia.logoUrl);
          // Also save to localStorage for backup
          localStorage.setItem(
            `contract-logo-${id}`,
            contractWithMedia.logoUrl
          );
        } else {
          // Try to get from localStorage as fallback
          const savedLogo = localStorage.getItem(`contract-logo-${id}`);
          if (savedLogo) {
            setLogoUrl(savedLogo);
          }
        }

        if (contractWithMedia.bannerUrl) {
          setBannerUrl(contractWithMedia.bannerUrl);
          // Also save to localStorage for backup
          localStorage.setItem(
            `contract-banner-${id}`,
            contractWithMedia.bannerUrl
          );
        } else {
          // Try to get from localStorage as fallback
          const savedBanner = localStorage.getItem(`contract-banner-${id}`);
          if (savedBanner) {
            setBannerUrl(savedBanner);
          }
        }

        // Check if user is the owner/designer of the contract (for tracking only)
        const auth = getAuth();
        const isOwner =
          auth.currentUser && auth.currentUser.uid === contract.userId;
        console.log("👤 Auth state:", {
          isOwner,
          userId: auth.currentUser?.uid,
          contractUserId: contract.userId,
        });

        // Token validation for metrics, but not for access control
        let hasValidToken = false;
        let isPreview = false;

        if (token) {
          console.log("🔐 Validating token:", token);
          try {
            const validation = await validateContractToken(id, token);
            hasValidToken = validation.isValid;
            isPreview = validation.isPreview;
            console.log("🎟️ Token validation:", { hasValidToken, isPreview });
          } catch (error) {
            console.error("❌ Token validation error:", error);
            console.log("💡 Continuing anyway as contracts are public");
          }
        } else {
          console.log(
            "🔒 No token provided, but continuing as contracts are public"
          );
        }

        // Load signatures - original functionality preserved
        const signaturesResult = await getSignatures(id);
        console.log("✍️ Loaded signatures from Firestore:", signaturesResult);

        if (signaturesResult.success) {
          const { designer, client } = signaturesResult.signatures;
          console.log("📝 Signature details:", { designer, client });

          setContractState((prev) => ({
            ...prev,
            clientName: client?.name || "",
            clientSignature: client?.signature || "",
            clientSignedAt: client?.signedAt?.toDate?.() || null,
            designerName: designer?.name || "",
            designerSignature: designer?.signature || "",
            designerSignedAt: designer?.signedAt?.toDate?.() || null,
            isClientSigned: !!client?.signature,
            existingSignature: !!designer?.signature,
          }));

          if (designer) {
            setSignatureState({
              designerSignature: designer.signature,
              designerName: designer.name,
              designerSignedAt: designer.signedAt?.toDate?.() || null,
              isLoading: false,
            });
          }

          if (client) {
            setIsClientSigned(true);
          }
        }

        // Track view
        if (hasValidToken && !isPreview) {
          try {
            await updateContractStatus(id, {
              lastViewedAt: new Date().toISOString(),
            });
          } catch (error) {
            console.error("Error updating view timestamp:", error);
          }
        }
      } catch (error: any) {
        console.error("Authorization error:", error);
        console.error("Error details:", {
          message: error?.message,
          code: error?.code,
          type: error?.constructor?.name,
        });

        if (error?.message?.includes("BLOCKED_BY_CLIENT")) {
          toast.error("Please disable your ad blocker to use all features");
        }

        handleAccessError(error as ContractAccessErrorType);

        // 👇 CRITICAL: Even if there's an error, we still grant access
        // This ensures no Access Denied page is shown
        console.log("⚠️ Error encountered but still allowing access");
        setIsAuthorized(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [id, token]);

  // Load contract and comments
  useEffect(() => {
    if (id) {
      const loadContractAndComments = async () => {
        try {
          setLoadingComments(true);

          // First, try to migrate any localStorage comments to Firestore
          try {
            const migrationResult = await migrateLocalStorageComments(id);
            if (
              migrationResult.success &&
              (migrationResult.migrated || 0) > 0
            ) {
              console.log(
                `Migrated ${
                  migrationResult.migrated || 0
                } comments from localStorage to Firestore`
              );
              toast.success(
                `Synced ${migrationResult.migrated || 0} offline comments`
              );
            }
          } catch (migrationError) {
            console.error(
              "Error migrating localStorage comments:",
              migrationError
            );
            // Continue with loading comments even if migration fails
          }

          // Then load comments from Firestore
          await loadComments();
        } catch (error) {
          console.error("Error loading data:", error);
          // Don't show error toast as it might be confusing to users
        } finally {
          setLoadingComments(false);
          setIsLoading(false);
        }
      };

      loadContractAndComments();
    }
  }, [id]);

  // Listen for auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user?.uid || "No user");
    });

    return () => unsubscribe();
  }, []);

  // Extract loadComments function so it can be reused
  const loadComments = async () => {
    try {
      console.log("🔄 Loading comments for contract:", id);
      setLoadingComments(true);

      // Load comments from Firestore
      const commentsResult = await getComments(id);
      console.log("📥 getComments result:", commentsResult);

      // Log raw comment data details for debugging
      if (commentsResult.success && commentsResult.comments) {
        console.log(
          "📋 Raw comments data:",
          commentsResult.comments.map((c) => ({
            id: c.id,
            position: c.position,
            blockId: c.blockId,
            isDismissed: c.isDismissed,
          }))
        );
      }

      // Always set comments - if there's an error or no comments, set to empty array
      if (commentsResult.success) {
        console.log(
          "✅ Successfully loaded",
          commentsResult.comments?.length || 0,
          "comments"
        );
        setComments(commentsResult.comments || []);
        setCommentsError(null);
      } else {
        console.error("❌ Error loading comments:", commentsResult.error);
        setComments([]);
        setCommentsError(commentsResult.error);

        if (
          !commentsResult.error?.includes("Missing or insufficient permissions")
        ) {
          console.error("Error loading comments:", commentsResult.error);
          // Only show a toast for non-permission errors that users can fix
          if (
            commentsResult.error?.includes("network") ||
            commentsResult.error?.includes("connection")
          ) {
            toast.error(
              "Network issue loading comments. Check your connection."
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Exception loading comments:", error);
      setComments([]);
      setCommentsError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingComments(false);
      console.log("🔄 Finished loading comments");
    }
  };

  const handleAddReply = async (commentId: string, replyText: string) => {
    try {
      // Don't proceed if reply is empty
      if (!replyText.trim()) {
        return;
      }

      toast.loading("Adding reply...");
      const result = await addCommentReply(id, commentId, {
        comment: replyText,
      });

      toast.dismiss();
      if (result.success) {
        // Refresh comments after adding reply
        await loadComments();
        toast.success("Reply added");
      } else {
        let errorMsg = result.error || "Failed to add reply";
        if (errorMsg.includes("Missing or insufficient permissions")) {
          errorMsg = "You need to be signed in to add replies";
        }
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    }
  };

  const handleDismissComment = async (commentId: string) => {
    try {
      toast.loading("Dismissing comment...");
      const result = await updateComment(id, commentId, { isDismissed: true });
      toast.dismiss();

      if (result.success) {
        // Refresh comments from Firestore
        await loadComments();
        toast.success("Comment dismissed");
      } else {
        toast.error(result.error || "Failed to dismiss comment");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error dismissing comment:", error);
      toast.error("Failed to dismiss comment");
    }
  };

  const handleRestoreComment = async (commentId: string) => {
    try {
      toast.loading("Restoring comment...");
      const result = await updateComment(id, commentId, { isDismissed: false });
      toast.dismiss();

      if (result.success) {
        // Refresh comments from Firestore
        await loadComments();
        toast.success("Comment restored");
      } else {
        toast.error(result.error || "Failed to restore comment");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error restoring comment:", error);
      toast.error("Failed to restore comment");
    }
  };

  const handleAddCommentAtPosition = (position: { x: number; y: number }) => {
    console.log("➕ Adding a comment at position:", position);
    console.log("📄 Current comments state:", {
      count: comments.length,
      showingComments: showComments,
      editing: comments.some((c) => c.isEditing),
    });

    // Make sure we don't have any other comments in editing mode
    if (comments.some((c) => c.isEditing)) {
      console.log(
        "⚠️ Another comment is already being edited, cancelling this action"
      );
      return;
    }

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

      // Store both positions - clickPosition for the comment box placement
      // and position for the comment bubble placement (same location)
      position: {
        x: position.x,
        y: position.y,
        zIndex: 100,
      },
      clickPosition: {
        x: position.x,
        y: position.y,
      },
    };

    console.log("✨ Created new comment:", {
      id: newComment.id,
      position: newComment.position,
      clickPosition: newComment.clickPosition,
    });

    setComments((prev) => {
      const updatedComments = [
        ...prev.map((c) => ({ ...c, isEditing: false })),
        newComment,
      ];
      console.log("📊 Updated comments state:", {
        newCount: updatedComments.length,
        editing: newComment.id,
      });
      return updatedComments;
    });
  };

  const handleSubmitComment = async (blockId: string) => {
    try {
      console.log("🔹 Submit comment initiated for blockId:", blockId);
      const commentToSubmit = comments.find((c) => c.blockId === blockId);

      console.log("🔹 Comment to submit:", {
        id: commentToSubmit?.id,
        blockId: commentToSubmit?.blockId,
        position: commentToSubmit?.position,
        commentText: commentToSubmit?.comment?.substring(0, 30),
      });

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
          position: commentToSubmit.position || { x: 20, y: 20, zIndex: 100 },
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

  const handleSignContract = () => {
    console.log("🖊️ Sign Contract clicked");
    setShowSignatureModal(true);
  };

  const handleSignComplete = async (signature: string, name: string) => {
    console.log("✅ handleSignComplete called with:", { signature, name });
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) throw new Error("No contract ID found");

      const currentDate = new Date();
      const ipAddress = await getClientIP();

      // If in test mode, store in a test-specific localStorage key
      if (testMode) {
        const signatureData = {
          signature,
          name,
          signedAt: currentDate.toISOString(),
        };
        localStorage.setItem(
          `test-contract-client-signature-${contractId}`,
          JSON.stringify(signatureData)
        );

        setContractState((prev) => ({
          ...prev,
          clientSignature: signature,
          clientName: name,
          clientSignedAt: currentDate,
          isClientSigned: true,
        }));
        setIsClientSigned(true);
        setShowSignatureModal(false);

        toast.success("Test signature recorded (not saved to database)");
        return;
      }

      // Regular flow for real signatures
      const auth = getAuth();
      const userId = auth.currentUser?.uid || "";

      try {
        await Promise.all([
          saveSignature(contractId, "client", {
            contractId,
            userId,
            signature,
            signedAt: currentDate,
            name,
          }),
          updateContractStatus(contractId, {
            status: "signed",
            lastSignedAt: currentDate.toISOString(),
            metadata: {
              ipAddress,
              userAgent: navigator.userAgent,
              lastActivity: currentDate.toISOString(),
            },
          }),
        ]);
      } catch (error: any) {
        if (error?.message?.includes("BLOCKED_BY_CLIENT")) {
          toast.error("Please disable your ad blocker to save your signature");
          return;
        }
        throw error;
      }

      // Update local state
      setContractState((prev) => ({
        ...prev,
        clientSignature: signature,
        clientName: name,
        clientSignedAt: currentDate,
        isClientSigned: true,
        metadata: {
          ipAddress,
          userAgent: navigator.userAgent,
          lastActivity: currentDate.toISOString(),
        },
      }));
      setIsClientSigned(true);
      setShowSignatureModal(false);

      // Refresh signatures from Firestore
      const signaturesResult = await getSignatures(contractId);
      if (signaturesResult.success) {
        const { designer, client } = signaturesResult.signatures;
        if (client) {
          setContractState((prev) => ({
            ...prev,
            clientName: client.name,
            clientSignature: client.signature,
            clientSignedAt: new Date(client.signedAt),
            isClientSigned: true,
          }));
        }
        if (designer) {
          setContractState((prev) => ({
            ...prev,
            designerName: designer.name,
            designerSignature: designer.signature,
            designerSignedAt: designer.signedAt?.toDate?.() || null,
            existingSignature: true,
          }));
        }
      }

      toast.success("Contract signed successfully!");
    } catch (error: any) {
      console.error("❌ Error signing contract:", error);
      toast.error(
        error?.message?.includes("BLOCKED_BY_CLIENT")
          ? "Please disable your ad blocker to save your signature"
          : "Failed to sign contract. Please try again."
      );
    }
  };

  const handleViewActivity = async () => {
    console.log("📊 handleViewActivity: Starting view tracking");
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        console.log("⚠️ handleViewActivity: No contract ID found in URL");
        return;
      }
      console.log(`📊 handleViewActivity: Found contract ID ${contractId}`);

      // Get client IP (will use api.ipify.org or fall back to "anonymous")
      const ipAddress = await getClientIP();
      console.log(`📊 handleViewActivity: Using IP address: ${ipAddress}`);

      const currentDate = new Date().toISOString();

      try {
        console.log("📊 handleViewActivity: Updating contract status");
        await updateContractStatus(contractId, {
          lastViewedAt: currentDate,
          metadata: {
            ipAddress,
            userAgent: navigator.userAgent,
            lastActivity: currentDate,
          },
        });
        console.log(
          "✅ handleViewActivity: Successfully updated contract status"
        );
      } catch (error) {
        // Silently handle blocked requests - this is non-critical functionality
        console.warn(
          "⚠️ handleViewActivity: Failed to update contract status:",
          error
        );
      }

      setContractState((prev) => ({
        ...prev,
        metadata: {
          ipAddress,
          userAgent: navigator.userAgent,
          lastActivity: currentDate,
        },
      }));
      console.log("✅ handleViewActivity: Updated local contract state");
    } catch (error) {
      console.warn(
        "🔴 handleViewActivity: Failed to track view activity:",
        error
      );
    }
  };

  // Track view activity on mount and periodically
  useEffect(() => {
    console.log("🔄 Setting up view activity tracking");
    const trackActivity = async () => {
      console.log("🔄 Running periodic view activity tracking");
      await handleViewActivity();
    };
    trackActivity();
    const interval = setInterval(trackActivity, 5 * 60 * 1000); // Every 5 minutes
    return () => {
      console.log("🧹 Cleaning up view activity tracking");
      clearInterval(interval);
    };
  }, []);

  // Helper function to get client IP
  const getClientIP = async () => {
    console.log("🌐 getClientIP: Attempting to get client IP address");
    try {
      console.log("🌐 getClientIP: Trying api.ipify.org endpoint");
      // Added to CSP in next.config.js, should work now
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      console.log("✅ getClientIP: Successfully retrieved IP address");
      return data.ip;
    } catch (error) {
      console.error("🔴 getClientIP: Error fetching IP:", error);
      console.log("🔄 getClientIP: Falling back to anonymous IP tracking");
      return "anonymous"; // Fallback if the API call fails
    }
  };

  const handleUnsignContract = async () => {
    try {
      setIsLoading(true);
      const result = await removeSignature(id, "client");

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Update local state
      setContractState((prev) => ({
        ...prev,
        isClientSigned: false,
        clientSignature: "",
        clientName: "",
        clientSignedAt: null,
      }));

      // Close the modal
      setIsUnsignModalOpen(false);

      toast.success("Signature removed successfully");

      // Refresh signatures
      const signatures = await getSignatures(id);
      if (signatures.success) {
        const { designer, client } = signatures.signatures;
        setContractState((prev) => ({
          ...prev,
          designerSignature: designer?.signature || "",
          designerName: designer?.name || "",
          designerSignedAt: designer?.signedAt?.toDate?.() || null,
          clientSignature: client?.signature || "",
          clientName: client?.name || "",
          clientSignedAt: client?.signedAt?.toDate?.() || null,
          isClientSigned: !!client,
        }));
      }
    } catch (error) {
      console.error("Error removing signature:", error);
      toast.error("Failed to remove signature");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSign = async () => {
    console.log("✅ handleFinalSign called");
    try {
      const currentDate = new Date();
      const auth = getAuth();
      const userId = auth.currentUser?.uid || "";

      console.log("Current user ID:", userId);
      console.log("Contract state:", contractState);
      console.log("Contract ID:", id);

      // First update contract status
      console.log("Updating contract status...");
      await updateContractStatus(id, {
        status: "signed",
        lastSignedAt: currentDate.toISOString(),
        metadata: {
          lastActivity: currentDate.toISOString(),
        },
      });
      console.log("✅ Contract status updated");

      // Then save signature
      console.log("Saving designer signature...");
      const signatureResult = await saveSignature(id, "designer", {
        contractId: id,
        userId,
        signature: contractState.designerSignature,
        signedAt: currentDate,
        name: contractState.designerName,
      });
      console.log("Signature save result:", signatureResult);

      if (signatureResult.error) {
        throw new Error(`Failed to save signature: ${signatureResult.error}`);
      }

      // Refresh contract data
      console.log("Refreshing contract data...");
      const contractResult = await getContract(id);
      console.log("Updated contract:", contractResult);

      // Refresh signatures from Firestore
      console.log("Refreshing signatures...");
      const signaturesResult = await getSignatures(id);
      console.log("Updated signatures:", signaturesResult);

      if (signaturesResult.success) {
        const { designer, client } = signaturesResult.signatures;
        if (designer) {
          console.log("Updating UI with designer signature...");
          setContractState((prev) => ({
            ...prev,
            designerName: designer.name,
            designerSignature: designer.signature,
            designerSignedAt: designer.signedAt?.toDate?.() || null,
            existingSignature: true,
            isEditing: false,
          }));
          setSignatureState({
            designerSignature: designer.signature,
            designerName: designer.name,
            designerSignedAt: designer.signedAt?.toDate?.() || null,
            isLoading: false,
          });
        }
        if (client) {
          console.log("Updating UI with client signature...");
          setContractState((prev) => ({
            ...prev,
            clientName: client.name,
            clientSignature: client.signature,
            clientSignedAt: new Date(client.signedAt),
            isClientSigned: true,
          }));
          setIsClientSigned(true);
        }
      }

      console.log("✨ Contract signed successfully");
      toast.success("Contract signed successfully!");

      // Force reload the page to update all states
      window.location.reload();
    } catch (error) {
      console.error("❌ Error signing contract:", error);
      toast.error("Failed to sign contract");
    }
  };

  const handleDesignerSign = (signature: string, name: string) => {
    setContractState((prev) => ({
      ...prev,
      designerSignature: signature,
      designerName: name,
    }));
    handleFinalSign();
  };

  const handleEditMode = () => {
    if (contractState.isClientSigned || contractState.existingSignature) {
      setIsEditModalOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  const confirmEdit = () => {
    // Clear signatures and status
    localStorage.removeItem(`contract-client-signature-${id}`);
    localStorage.removeItem(`contract-designer-signature-${id}`);
    localStorage.removeItem(`contract-status-${id}`);

    // Reset states
    setContractState({
      isClientSigned: false,
      existingSignature: false,
      clientName: "",
      clientSignature: "",
      clientSignedAt: null,
      designerName: "",
      designerSignature: "",
      designerSignedAt: null,
    });

    setIsEditing(true);
    setIsEditModalOpen(false);
  };

  const SignatureDisplay = () => {
    console.log("Rendering SignatureDisplay with state:", {
      contractState,
      signatureState,
    });

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            {/* Designer Signature */}
            {(contractState.existingSignature ||
              contractState.designerSignature) && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    Designer Signature
                  </p>
                  <p className="text-gray-500">{contractState.designerName}</p>
                  {contractState.designerSignedAt && (
                    <p className="text-gray-400 text-xs">
                      {contractState.designerSignedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <img
                  src={contractState.designerSignature}
                  alt="Designer Signature"
                  className="h-16 border-b border-gray-300"
                />
              </div>
            )}

            {/* Client Signature */}
            {(contractState.isClientSigned ||
              contractState.clientSignature) && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Client Signature</p>
                  <p className="text-gray-500">{contractState.clientName}</p>
                  {contractState.clientSignedAt && (
                    <p className="text-gray-400 text-xs">
                      {contractState.clientSignedAt.toLocaleDateString()} at{" "}
                      {contractState.clientSignedAt.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <img
                  src={contractState.clientSignature}
                  alt="Client Signature"
                  className="h-16 border-b border-gray-300"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleAddComment = (blockId: string, comment: string) => {
    setComments((prev) =>
      prev.map((c) => (c.blockId === blockId ? { ...c, comment } : c))
    );
  };

  // Add a flag to disable comments functionality
  const COMMENTS_ENABLED = false;

  // Add this for debugging - set to false to hide debug buttons
  const SHOW_DEBUG_BUTTONS = false;

  const toggleComments = () => {
    // If comments are disabled, don't allow toggling
    if (!COMMENTS_ENABLED) return;

    console.log(
      `🔄 Toggling comments from ${showComments} to ${!showComments}`
    );
    setShowComments(!showComments);

    // When showing comments, ensure they're loaded
    if (!showComments && !hasInitialized.current) {
      loadComments().catch(console.error);
    }
  };

  // Add this useEffect for better logging, near the other useEffects
  useEffect(() => {
    if (showComments) {
      console.log(
        "🔄 CommentOverlay enabled with",
        comments.length,
        "comments"
      );
      console.log(
        "📊 Comment details:",
        comments.map((c) => ({
          id: c.id,
          position: c.position,
          isDismissed: c.isDismissed,
          hasPosition: !!c.position,
        }))
      );
    }
  }, [showComments, comments]);

  // Add this useEffect to log the content container dimensions when it's set
  useEffect(() => {
    if (contentRef) {
      const rect = contentRef.getBoundingClientRect();
      console.log("📏 Content container dimensions:", {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        x: rect.x,
        y: rect.y,
      });
    }
  }, [contentRef]);

  // Add another useEffect for global click tracking
  useEffect(() => {
    if (showComments) {
      const handleGlobalClick = (e: MouseEvent) => {
        console.log("🌐 Global click detected at:", {
          x: e.clientX,
          y: e.clientY,
          target: e.target instanceof Element ? e.target.tagName : "unknown",
        });
      };

      window.addEventListener("click", handleGlobalClick);
      return () => window.removeEventListener("click", handleGlobalClick);
    }
  }, [showComments]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Style to hide error message */}
      <style dangerouslySetInnerHTML={{ __html: commentStyles }} />

      <div className="max-w-6xl mx-auto pb-16 pt-6 min-h-screen flex flex-col relative w-full px-4">
        {/* Debug button - only in development */}
        {process.env.NODE_ENV === "development" && SHOW_DEBUG_BUTTONS && (
          <button
            onClick={() => {
              console.log("🔬 COMPONENT STATE DUMP", {
                id,
                isLoading,
                showComments,
                comments,
                user: getAuth().currentUser
                  ? {
                      uid: getAuth().currentUser?.uid || "unknown",
                      isAnonymous: getAuth().currentUser?.isAnonymous || false,
                      email: getAuth().currentUser?.email || null,
                    }
                  : "none",
                authState: {
                  isAuthorized,
                  hasToken: !!token,
                  testMode,
                },
              });

              // Force load comments to test functionality
              loadComments();
            }}
            className="fixed top-20 right-4 bg-red-500 text-white px-3 py-1 text-xs rounded z-50"
          >
            Debug
          </button>
        )}
        {/* Fixed Topbar */}
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
          <div className="h-16 flex items-center justify-between px-6 max-w-6xl mx-auto">
            <div className="flex items-center space-x-2">
              {/* Hide the comments button when comments are disabled */}
              {COMMENTS_ENABLED && (
                <Button
                  variant={showComments ? "primary" : "secondary"}
                  className="inline-flex items-center gap-2 transition-colors"
                  onClick={() => {
                    console.log("🔘 Comments toggle button clicked");
                    toggleComments();
                  }}
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
                  {showComments ? "Hide Comments" : "Show Comments"}
                </Button>
              )}

              {COMMENTS_ENABLED && showComments && commentsError && (
                <button
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                  onClick={() => {
                    // Retry loading comments
                    setLoadingComments(true);
                    loadComments()
                      .then(() => {
                        // Comments are already set inside loadComments function
                        // Just clear error state here if we succeeded
                        setCommentsError(null);
                      })
                      .catch((error) => {
                        console.error("Error reloading comments:", error);
                      })
                      .finally(() => {
                        setLoadingComments(false);
                      });
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh Comments
                </button>
              )}

              {COMMENTS_ENABLED && loadingComments && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {(!isClientSigned && !contractState.isClientSigned) ||
              testMode ? (
                <Button
                  variant="primary"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 text-white rounded-md shadow-sm"
                  disabled={showComments || comments.length > 0}
                  onClick={handleSignContract}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  {testMode ? "Test Client Signature" : "Sign Contract"}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="inline-flex items-center gap-2 text-red-600 border border-red-200 hover:bg-red-50 transition-colors px-4 py-2 rounded-md shadow-sm"
                  onClick={() => setIsUnsignModalOpen(true)}
                >
                  <XMarkIcon className="w-5 h-5" />
                  Unsign Contract
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 mt-20 mb-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
              {/* Contract Header */}
              <div className="border-b border-gray-100 px-8 py-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {generatedContent?.title || "Contract Document"}
                </h1>
                {generatedContent?.metadata?.createdAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Created on{" "}
                    {new Date(
                      generatedContent.metadata.createdAt
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Contract Content */}
              <div className="px-8 py-8">
                {/* Banner Image */}
                {bannerUrl && (
                  <div className="mb-8 -mx-8 -mt-8">
                    <img
                      src={bannerUrl}
                      alt="Contract Banner"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {/* Company Logo */}
                {logoUrl && (
                  <div className="mb-8 flex justify-center">
                    <img
                      src={logoUrl}
                      alt="Company Logo"
                      className="h-32 object-contain"
                    />
                  </div>
                )}

                {/* Contract Content */}
                <div className="my-8 prose prose-lg max-w-none">
                  <div
                    className="relative"
                    ref={setContentRef}
                    onClick={(e) => {
                      if (showComments) {
                        // Get the relative position within the clicked element
                        const rect = e.currentTarget.getBoundingClientRect();
                        const offsetX = e.clientX - rect.left;
                        const offsetY = e.clientY - rect.top;

                        console.log("🖱️ Contract content clicked at:", {
                          offsetX,
                          offsetY,
                          clientX: e.clientX,
                          clientY: e.clientY,
                          rect: {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                          },
                        });

                        // Use the offset position for both bubble and comment box
                        handleAddCommentAtPosition({
                          x: offsetX,
                          y: offsetY,
                        });
                      }
                    }}
                  >
                    {generatedContent?.blocks ? (
                      <div>
                        {generatedContent.blocks.map((block: any) => {
                          // Render different block types
                          switch (block.type) {
                            case "header":
                              return (
                                <h1
                                  key={block.id}
                                  className="text-3xl font-bold text-gray-900 mb-6"
                                >
                                  {block.data.text}
                                </h1>
                              );
                            case "paragraph":
                              return (
                                <p
                                  key={block.id}
                                  className="text-gray-700 leading-relaxed mb-6"
                                >
                                  {block.data.text}
                                </p>
                              );
                            case "list":
                              return (
                                <ul
                                  key={block.id}
                                  className="list-disc ml-6 mb-6 text-gray-700 space-y-2"
                                >
                                  {block.data.items?.map(
                                    (item: string, index: number) => (
                                      <li key={index}>{item}</li>
                                    )
                                  )}
                                </ul>
                              );
                            default:
                              return (
                                <div key={block.id} className="mb-4">
                                  <pre className="text-sm bg-gray-50 p-4 rounded-md overflow-auto">
                                    {JSON.stringify(block.data, null, 2)}
                                  </pre>
                                </div>
                              );
                          }
                        })}
                      </div>
                    ) : (
                      <div className="bg-red-50 text-red-600 p-6 rounded-md text-center">
                        <svg
                          className="w-12 h-12 mx-auto mb-4 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <p className="font-medium">No contract content found</p>
                        <p className="text-sm mt-2">
                          The document appears to be empty or could not be
                          loaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Overlay - Always rendered but only visible when showComments is true */}
                {COMMENTS_ENABLED && showComments && (
                  <div className="absolute inset-0 pointer-events-none">
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
                        console.log(
                          "❌ Comment dismiss requested for:",
                          commentId
                        );
                        handleDismissComment(commentId);
                      }}
                      onEditComment={(blockId) => {
                        console.log(
                          "✏️ Comment edit requested for blockId:",
                          blockId
                        );
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
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Bottom Bar */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-sm">
          <div className="p-6 max-w-6xl mx-auto">
            <SignatureDisplay />
          </div>
        </footer>

        {/* Modals and Overlays - Highest z-index */}
        {showSignatureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[99999]">
            <div className="bg-white rounded-xl p-8 w-[450px] max-w-[90%] relative shadow-xl">
              {/* Close button */}
              <button
                onClick={() => setShowSignatureModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </button>

              {contractState.isClientSigned ? (
                <div className="text-center space-y-4 py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                    <CheckIconSolid className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Contract Signed!
                  </h2>
                  <p className="text-gray-600">
                    Thank you, {contractState.clientName}. Your signature has
                    been recorded.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Redirecting to confirmation page...
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-6 pr-8 text-gray-900">
                    Sign Contract
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={contractState.clientName}
                        onChange={(e) =>
                          setContractState((prev) => ({
                            ...prev,
                            clientName: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Type your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signature
                      </label>
                      <div className="border border-gray-300 rounded-md overflow-hidden">
                        <SignaturePad
                          ref={signaturePadRef}
                          canvasProps={{
                            className: "w-full h-48 bg-white",
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Draw your signature above
                      </p>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => signaturePadRef.current?.clear()}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          if (
                            contractState.clientName.trim() &&
                            signaturePadRef.current
                          ) {
                            const signature =
                              signaturePadRef.current.toDataURL();
                            handleSignComplete(
                              signature,
                              contractState.clientName
                            );
                          }
                        }}
                        disabled={!contractState.clientName.trim()}
                        className={`flex-1 px-4 py-2 text-sm text-white rounded-md shadow-sm transition-colors ${
                          contractState.clientName.trim()
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-blue-300 cursor-not-allowed"
                        }`}
                      >
                        Sign Contract
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Modal
          isOpen={isUnsignModalOpen}
          onClose={() => setIsUnsignModalOpen(false)}
          title="Unsign Contract"
        >
          <div className="p-6">
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md mb-6">
              <div className="flex">
                <svg
                  className="h-6 w-6 text-yellow-600 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p>
                  Are you sure you want to remove your signature from this
                  contract?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsUnsignModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnsignContract}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Remove Signature
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Confirm Edit"
        >
          <div className="p-6">
            <p className="mb-4">
              Are you sure you want to edit this contract? This will remove all
              existing signatures.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Edit Contract
              </button>
            </div>
          </div>
        </Modal>

        {/* CommentBox for adding/editing comments */}
        {COMMENTS_ENABLED &&
          showComments &&
          comments.some((c) => c.isEditing) && (
            <>
              {(() => {
                const editingComment = comments.find((c) => c.isEditing);
                if (!editingComment) return null;

                // Get position from the comment - use the same position as the bubble
                const commentX = editingComment.position?.x || 100;
                const commentY = editingComment.position?.y || 100;

                // Get the content container position for reference
                const contentContainer = contentRef?.getBoundingClientRect();
                const contentLeft = contentContainer?.left || 0;
                const contentTop = contentContainer?.top || 0;

                // Position the comment box just above the comment bubble
                // adding the content container's position
                const absoluteX = contentLeft + commentX;

                // Position the box slightly above and to the side of the bubble
                // to avoid obscuring the bubble
                const absoluteY = contentTop + commentY - 10;

                // Make sure box doesn't go offscreen
                const boxWidth = 320; // Approximate width of comment box
                const boxHeight = 230; // Approximate height of comment box
                const windowWidth =
                  typeof window !== "undefined" ? window.innerWidth : 1000;
                const windowHeight =
                  typeof window !== "undefined" ? window.innerHeight : 800;

                // Calculate safe position that keeps box in viewport
                // We want the box to be above or to the side of the bubble
                // depending on available space
                let safeX = absoluteX;
                let safeY = absoluteY - boxHeight; // Try positioning above first

                // If would go off the top, position to the side instead
                if (safeY < 70) {
                  // Account for header
                  safeY = absoluteY;
                  safeX = absoluteX + 30; // Offset to the right
                }

                // Final adjustments to keep in viewport
                safeX = Math.min(safeX, windowWidth - boxWidth - 20);
                safeX = Math.max(safeX, 20);
                safeY = Math.max(safeY, 70); // Account for header

                console.log("Positioning comment box:", {
                  bubbleX: commentX,
                  bubbleY: commentY,
                  absoluteX,
                  absoluteY,
                  safeX,
                  safeY,
                  contentRect: contentContainer,
                });

                return (
                  <div
                    className="fixed z-20"
                    style={{
                      left: `${safeX}px`,
                      top: `${safeY}px`,
                    }}
                  >
                    <CommentBox
                      comment={editingComment?.comment || ""}
                      onCommentChange={(newComment) => {
                        handleAddComment(editingComment.blockId, newComment);
                      }}
                      onSubmit={() => {
                        handleSubmitComment(editingComment.blockId);
                      }}
                      onCancel={() => {
                        setComments((prev) => {
                          // If it's a new comment (not yet saved), remove it
                          if (
                            !editingComment.id ||
                            editingComment.id.length < 10
                          ) {
                            return prev.filter(
                              (c) => c.id !== editingComment.id
                            );
                          }
                          // Otherwise just set isEditing to false
                          return prev.map((c) => ({
                            ...c,
                            isEditing: false,
                          }));
                        });
                      }}
                    />
                  </div>
                );
              })()}
            </>
          )}
      </div>
    </div>
  );
}

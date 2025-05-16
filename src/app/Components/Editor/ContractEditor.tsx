"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import { LockClosedIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { LockClosedIcon as LockClosedSolidIcon } from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import {
  saveContract,
  getSignatures,
  removeSignature,
  saveSignature,
  updateContractStatus,
} from "@/lib/firebase/firestore";
import { ContractAudit } from "./ContractAudit";
import { SigningStage } from "./SigningStage";
import { SendStage } from "./SendStage";
import Modal from "../Modal";
import ImageUploader from "./ImageUploader";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import confetti from "canvas-confetti";
import { Contract, Signature } from "@/lib/firebase/types";
import DragDrop from "editorjs-drag-drop";
import Image from "@editorjs/image";

interface ContractEditorProps {
  formData: any;
  initialContent: any;
  onAuditFix?: () => void;
  stage?: "edit" | "sign" | "send";
  onStageChange?: (stage: "edit" | "sign" | "send") => void;
  onBlockClick?: (block: any) => void;
}

export function ContractEditor({
  formData,
  initialContent,
  onAuditFix,
  stage = "edit",
  onStageChange,
  onBlockClick,
}: ContractEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [logoUrl, setLogoUrl] = useState(() => {
    const contractId = window.location.pathname.split("/").pop();
    // First check if it was provided in initialContent
    if (initialContent?.logoUrl) {
      return initialContent.logoUrl;
    }
    // Otherwise try localStorage for this specific contract
    const savedLogo = localStorage.getItem(`contract-logo-${contractId}`);
    if (savedLogo) {
      return savedLogo;
    }

    // If no contract-specific logo, try to use the default profile image
    const userId = localStorage.getItem("userId");
    if (userId) {
      const defaultProfileImage = localStorage.getItem(
        `defaultProfileImage-${userId}`
      );
      if (defaultProfileImage) {
        return defaultProfileImage;
      }
    }

    return "/placeholder-logo.png";
  });

  const [bannerUrl, setBannerUrl] = useState(() => {
    const contractId = window.location.pathname.split("/").pop();
    // First check if it was provided in initialContent
    if (initialContent?.bannerUrl) {
      return initialContent.bannerUrl;
    }
    // Otherwise try localStorage for this specific contract
    const savedBanner = localStorage.getItem(`contract-banner-${contractId}`);
    if (savedBanner) {
      return savedBanner;
    }

    // If no contract-specific banner, try to use the default profile banner
    const userId = localStorage.getItem("userId");
    if (userId) {
      const defaultProfileBanner = localStorage.getItem(
        `defaultProfileBanner-${userId}`
      );
      if (defaultProfileBanner) {
        return defaultProfileBanner;
      }
    }

    return "/placeholder-banner.png";
  });
  const [editorContent, setEditorContent] = useState(() => {
    const contractId = window.location.pathname.split("/").pop();
    // Prioritize initialContent if it exists
    if (initialContent && Object.keys(initialContent).length > 0) {
      return initialContent;
    }
    const savedContent = localStorage.getItem(`contract-content-${contractId}`);
    return savedContent
      ? JSON.parse(savedContent)
      : {
          blocks: [
            {
              type: "paragraph",
              data: {
                text: "Start writing your contract here...",
              },
            },
          ],
        };
  });
  const [isLocked, setIsLocked] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const initialLoadDone = useRef(false);
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const saveTimeout = useRef<NodeJS.Timeout>();
  const [designerSignature, setDesignerSignature] = useState<any>(null);
  const [clientSignature, setClientSignature] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUnsignModalOpen, setIsUnsignModalOpen] = useState(false);

  // Load saved stage on mount
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    const savedStage = localStorage.getItem(`contract-stage-${contractId}`);
    if (
      savedStage &&
      (savedStage === "edit" || savedStage === "sign" || savedStage === "send")
    ) {
      const event = new CustomEvent("stageChange", { detail: savedStage });
      window.dispatchEvent(event);
    }
  }, []);

  // Load signatures from Firestore
  useEffect(() => {
    const loadSignatures = async () => {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) return;

      try {
        const result = await getSignatures(contractId);
        if (result.success) {
          setDesignerSignature(result.signatures.designer);
          setClientSignature(result.signatures.client);

          // If either signature exists, lock the editor
          if (result.signatures.designer || result.signatures.client) {
            setHasSignature(true);
            setIsLocked(true);
          }
        }
      } catch (error) {
        console.error("Failed to load signatures:", error);
      }
    };

    loadSignatures();
  }, []);

  // Simplified stage management
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // Check for signatures in both Firestore state and localStorage
    const designerSig = localStorage.getItem(
      `contract-designer-signature-${contractId}`
    );
    const hasDesignerSignature = !!designerSig || !!designerSignature;
    const hasContent = editorContent && Object.keys(editorContent).length > 0;

    // Force the editor to be unlocked in edit mode, regardless of signature status
    let newLockState = false;
    if (stage === "edit") {
      newLockState = false;

      // In edit mode, we want the editor to be unlocked but we still want
      // to preserve signature state for the audit panel and unsign functionality
      // So we don't clear signatures here anymore
    } else if (stage === "sign") {
      // Only lock in sign stage if we have a designer signature
      newLockState = !!designerSignature;
    } else if (stage === "send") {
      newLockState = true;
    }

    // Only update lock state if it's changing
    if (isLocked !== newLockState) {
      setIsLocked(newLockState);
    }

    // Always set hasSignature based on current state
    if (hasSignature !== hasDesignerSignature) {
      setHasSignature(hasDesignerSignature);
    }

    // Save current stage to localStorage
    localStorage.setItem(`contract-stage-${contractId}`, stage);

    // Only force send stage on initial load if we have content and signature
    if (hasDesignerSignature && hasContent && !initialLoadDone.current) {
      const event = new CustomEvent("stageChange", { detail: "send" });
      window.dispatchEvent(event);
      initialLoadDone.current = true;
    }

    // If no content, force edit stage
    if (!hasContent && stage !== "edit") {
      const event = new CustomEvent("stageChange", { detail: "edit" });
      window.dispatchEvent(event);
      toast.error("Please create your contract before proceeding");
    }

    // Re-fetch signatures when changing to sign stage
    if (stage === "sign") {
      const contractId = window.location.pathname.split("/").pop();
      if (contractId) {
        getSignatures(contractId)
          .then((result) => {
            if (result.success) {
              if (result.signatures.designer) {
                setDesignerSignature(result.signatures.designer);
              }
              if (result.signatures.client) {
                setClientSignature(result.signatures.client);
              }
            }
          })
          .catch((error) => {
            console.error("Error fetching signatures:", error);
          });
      }
    }
  }, [
    stage,
    editorContent,
    designerSignature,
    isLocked,
    hasSignature,
    clientSignature,
  ]);

  // Save content to localStorage whenever it changes
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId || !editorContent) return;

    // Set saving status
    setSaveStatus("saving");

    // Clear previous timeout
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    // Save to localStorage immediately
    localStorage.setItem(
      `contract-content-${contractId}`,
      JSON.stringify(editorContent)
    );

    // Save to Firestore with debounce
    saveTimeout.current = setTimeout(async () => {
      try {
        await saveContract({
          id: contractId,
          content: editorContent,
          logoUrl: logoUrl !== "/placeholder-logo.png" ? logoUrl : null,
          bannerUrl: bannerUrl !== "/placeholder-banner.png" ? bannerUrl : null,
          updatedAt: new Date(),
          status: "draft",
          userId: user?.uid || "",
          title: "Contract",
          createdAt: new Date(),
          version: 1,
        } as any); // Type assertion to bypass the strict type checking
        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save content:", error);
        setSaveStatus("error");
        toast.error("Failed to save changes");
      }
    }, 1000); // Debounce for 1 second

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [editorContent, logoUrl, bannerUrl, user?.uid]);

  // Handle editor locking separately
  useEffect(() => {
    const initializeReadOnly = async () => {
      if (!editorRef.current) return;

      try {
        // Wait for editor to be ready
        await new Promise((resolve) => {
          if (editorRef.current?.isReady) {
            resolve(true);
          } else if (editorRef.current) {
            editorRef.current.on("ready", () => resolve(true));
          }
        });

        // Now safely set readOnly mode
        const editor = editorRef.current;
        if (editor && typeof editor.readOnly?.toggle === "function") {
          // Always ensure edit mode gets an unlocked editor
          if (stage === "edit") {
            if (editor.readOnly.isEnabled) {
              editor.readOnly.toggle();
            }

            // Direct DOM manipulation to ensure editability in edit mode
            setTimeout(() => {
              try {
                const editorElement = containerRef.current;
                if (editorElement) {
                  // Make all contenteditable elements truly editable
                  const editableElements = editorElement.querySelectorAll(
                    '[contenteditable="false"]'
                  );
                  editableElements.forEach((el: Element) => {
                    (el as HTMLElement).setAttribute("contenteditable", "true");
                  });

                  // Remove any pointer-events-none classes
                  const lockedElements = editorElement.querySelectorAll(
                    ".pointer-events-none"
                  );
                  lockedElements.forEach((el: Element) => {
                    el.classList.remove("pointer-events-none");
                  });

                  // Hide any lock overlays
                  const lockOverlays = document.querySelectorAll(
                    ".absolute.bg-gray-50.bg-opacity-50"
                  );
                  lockOverlays.forEach((el: Element) => {
                    (el as HTMLElement).style.display = "none";
                  });
                }
              } catch (error) {
                console.error("Error manually unlocking editor:", error);
              }
            }, 100);
          } else {
            // For other stages, follow the lock state
            if (isLocked && !editor.readOnly.isEnabled) {
              editor.readOnly.toggle();
            } else if (!isLocked && editor.readOnly.isEnabled) {
              editor.readOnly.toggle();
            }
          }
        }
      } catch (error) {
        console.error("Error setting editor readOnly mode:", error);
      }
    };

    initializeReadOnly();
  }, [isLocked, stage]);

  // Initialize editor with change handler
  useEffect(() => {
    if (editorRef.current || !containerRef.current) return;

    const editor = new EditorJS({
      holder: containerRef.current,
      readOnly: isLocked,
      tools: {
        header: Header,
        list: List,
        paragraph: Paragraph,
        image: {
          class: Image,
          config: {
            endpoints: {
              byFile: "/api/uploadImage",
            },
          },
        },
      },
      data: editorContent || {
        blocks: [
          {
            type: "paragraph",
            data: {
              text: "Start writing your contract here...",
            },
          },
        ],
      },
      onReady: () => {
        // Initialize drag-drop functionality
        new DragDrop(editor);

        // Set initial readOnly state if needed
        if (isLocked && editor.readOnly && !editor.readOnly.isEnabled) {
          editor.readOnly.toggle();
        }
      },
      onChange: async (api) => {
        try {
          const content = await api.saver.save();
          setEditorContent(content);
          const contractId = window.location.pathname.split("/").pop();
          if (!contractId) return;

          // Extract title from first header block or first paragraph
          let title = "Untitled Contract";
          if (content.blocks && content.blocks.length > 0) {
            const firstBlock = content.blocks[0];
            if (firstBlock.type === "header") {
              title = firstBlock.data.text;
            } else if (firstBlock.type === "paragraph") {
              // Use first paragraph if no header (limit to reasonable length)
              title =
                firstBlock.data.text.substring(0, 50) +
                (firstBlock.data.text.length > 50 ? "..." : "");
            }
          }

          // Check for designer signature
          const designerSignature = localStorage.getItem(
            `contract-designer-signature-${contractId}`
          );
          const status = designerSignature ? "pending" : "draft";

          // Save to Firestore
          await saveContract({
            id: contractId,
            content: content,
            updatedAt: new Date(),
            status: status,
            userId: user?.uid || "",
            title: title,
            createdAt: new Date(),
            version: 1,
          } as any); // Type assertion to bypass the strict type checking
        } catch (error) {
          console.error("Failed to save content:", error);
          toast.error("Failed to save changes");
        }
      },
    });

    editorRef.current = editor;

    // Set up a listener for blockClick if onBlockClick handler is provided
    if (onBlockClick) {
      const handleBlockClicks = () => {
        const editorContainer = containerRef.current;
        if (!editorContainer) return;

        // Add click event listeners to all blocks
        editorContainer.addEventListener("click", async (e) => {
          try {
            // Find the clicked block
            const blockElement = (e.target as HTMLElement).closest(".ce-block");
            if (!blockElement) return;

            // Get the block index
            const blockIndex = Array.from(
              editorContainer.querySelectorAll(".ce-block")
            ).indexOf(blockElement);
            if (blockIndex === -1) return;

            // Get the block data from the editor
            const content = await editor.save();
            if (!content.blocks || blockIndex >= content.blocks.length) return;

            // Call the handler with the block data
            onBlockClick(content.blocks[blockIndex]);
          } catch (error) {
            console.error("Error handling block click:", error);
          }
        });
      };

      // Wait for editor to be ready before setting up handlers
      if (editor) {
        // Check if editor is already ready
        if (typeof editor.isReady === "boolean" && editor.isReady) {
          handleBlockClicks();
        } else {
          // Otherwise wait for ready event
          editor.on("ready", handleBlockClicks);
        }
      }
    }

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [user?.uid, isLocked, editorContent, onBlockClick]);

  // Add effect to check for both signatures and trigger celebration
  useEffect(() => {
    if (designerSignature && clientSignature && !showSuccess) {
      setShowSuccess(true);
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [designerSignature, clientSignature, showSuccess]);

  // Utility function to clear localStorage space
  const clearLocalStorageSpace = (currentContractId: string) => {
    try {
      console.log("Clearing localStorage space...");

      // Find all contract-related items
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes("contract-")) {
          keysToCheck.push(key);
        }
      }

      // Sort by priority (remove signatures first, then other contract data)
      const keysToRemove = [
        // First remove old signature data (not for current contract)
        ...keysToCheck.filter(
          (k) => k.includes("signature") && !k.includes(currentContractId)
        ),
        // Then remove other old contract data
        ...keysToCheck.filter(
          (k) => !k.includes(currentContractId) && !k.includes("signature")
        ),
      ];

      // Remove up to 10 items
      keysToRemove.slice(0, 10).forEach((key) => {
        console.log(`Removing localStorage item: ${key}`);
        localStorage.removeItem(key);
      });

      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  };

  const handleUnsign = async () => {
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) throw new Error("No contract ID found");

      // Remove from localStorage
      localStorage.removeItem(`contract-designer-signature-${contractId}`);

      // Clear any potential localStorage items that might be full
      clearLocalStorageSpace(contractId);

      // Remove from Firestore and update contract status
      await removeSignature(contractId, "designer");

      // Update local state for designer signature only
      setDesignerSignature(null);
      setHasSignature(false);
      setIsLocked(false);

      // Force unlock the editor if it exists
      if (editorRef.current) {
        if (editorRef.current.readOnly?.isEnabled) {
          editorRef.current.readOnly.toggle();
        }

        // Force DOM update to remove readonly attributes
        setTimeout(() => {
          try {
            // Find all editable elements in the editor and remove readonly attributes
            const editorElement = containerRef.current;
            if (editorElement) {
              const editableElements = editorElement.querySelectorAll(
                '[contenteditable="false"]'
              );
              editableElements.forEach((el: Element) => {
                (el as HTMLElement).setAttribute("contenteditable", "true");
              });

              // Remove any pointer-events-none classes
              const lockedElements = editorElement.querySelectorAll(
                ".pointer-events-none"
              );
              lockedElements.forEach((el: Element) => {
                el.classList.remove("pointer-events-none");
              });

              // Hide lock overlays but don't remove them
              const lockOverlay = document.querySelector(
                ".absolute.inset-0.bg-gray-50.bg-opacity-50"
              );
              if (lockOverlay) {
                (lockOverlay as HTMLElement).style.display = "none";
              }

              // Hide lock indicator but don't remove it
              const lockIndicator = document.querySelector(
                ".absolute.top-0.left-0.right-0.bg-gray-100"
              );
              if (lockIndicator) {
                (lockIndicator as HTMLElement).style.display = "none";
              }
            }
          } catch (error) {
            console.error("Error forcing editor to be editable:", error);
          }
        }, 100);
      }

      // Re-fetch client signature to ensure it's still displayed if present
      try {
        const result = await getSignatures(contractId);
        if (result.success && result.signatures.client) {
          setClientSignature(result.signatures.client);
        }
      } catch (error) {
        console.error("Error re-fetching client signature:", error);
      }

      // Update contract status
      await updateContractStatus(contractId, {
        status: "draft",
        updatedAt: new Date().toISOString(),
      });

      // No longer dispatch stage change event here, as it's handled by the calling function
      return true;
    } catch (error) {
      console.error("Error removing signature:", error);
      toast.error("Failed to remove signature");
      return false;
    }
  };

  const handleUnsignConfirm = async () => {
    try {
      await handleUnsign();
      setIsUnsignModalOpen(false);

      // Explicitly transition to edit mode after signature removal
      const editEvent = new CustomEvent("stageChange", {
        detail: {
          stage: "edit",
          confirmed: true,
          source: "unsign-confirm",
          allowWithSignatures: false,
        },
      });
      window.dispatchEvent(editEvent);

      // Show a success toast explaining what happened
      toast.success("Signature removed. You can now edit the contract.");
    } catch (error) {
      console.error("Error during unsign:", error);
      toast.error("Failed to remove signature");
    }
  };

  // Handle switching to sign stage after unsigning
  const handleSignStageClick = () => {
    // If already in sign stage, do nothing
    if (stage === "sign") return;

    // Just switch to sign stage without checking for signature
    // The stage management useEffect will handle the locking state
    const event = new CustomEvent("stageChange", { detail: "sign" });
    window.dispatchEvent(event);
  };

  // Handle stage changes
  useEffect(() => {
    // No longer needed to show the unsign modal automatically
    // This gives the user more control over when to unsign
  }, [stage, designerSignature]); // Only depend on designer signature

  const handleSignatureComplete = async (signature: string, name: string) => {
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        throw new Error("No contract ID found");
      }

      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      // Create signature data object
      const signatureData = {
        signature,
        name,
        signedAt: new Date().toISOString(),
      };

      // Try to save to localStorage with error handling for quota issues
      try {
        localStorage.setItem(
          `contract-designer-signature-${contractId}`,
          JSON.stringify(signatureData)
        );
      } catch (storageError) {
        console.warn("localStorage quota exceeded, clearing space...");

        // Clear other items related to this contract to make space
        if (clearLocalStorageSpace(contractId)) {
          // Try again
          try {
            localStorage.setItem(
              `contract-designer-signature-${contractId}`,
              JSON.stringify(signatureData)
            );
          } catch (retryError) {
            console.error(
              "Still failed to save signature to localStorage after clearing space"
            );
          }
        }
      }

      // Save to Firestore
      const firestoreSignature = {
        contractId,
        userId: user.uid,
        signedAt: new Date(),
        signature,
        name,
      };

      const result = await saveSignature(
        contractId,
        "designer",
        firestoreSignature
      );
      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      setDesignerSignature({
        ...firestoreSignature,
        signedAt: { toDate: () => firestoreSignature.signedAt },
      });
      setHasSignature(true);
      setIsLocked(true);

      // Update contract status
      await updateContractStatus(contractId, {
        status: "signed",
        updatedAt: new Date().toISOString(),
      });

      // Trigger stage change to send
      const event = new CustomEvent("stageChange", { detail: "send" });
      window.dispatchEvent(event);

      toast.success("Contract signed successfully!");
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Failed to save signature");
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploadFile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const data = await response.json();

      // Update contract with PDF URL
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) throw new Error("No contract ID found");

      await saveContract({
        id: contractId,
        pdf: data.url,
        updatedAt: new Date(),
      } as any); // Type assertion to bypass the strict type checking

      toast.success("PDF uploaded successfully");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Failed to upload PDF");
    }
  };

  const highlightBlock = (position: any, type: string) => {
    const editorElement = containerRef.current;
    if (!editorElement) return;

    const blocks = editorElement.querySelectorAll(".ce-block");
    if (!blocks || !position) return;

    const targetBlock = blocks[position.blockIndex];
    if (!targetBlock) return;

    if (!targetBlock.classList.contains("audit-highlight")) {
      targetBlock.classList.add("audit-highlight");
      targetBlock.classList.add(`audit-highlight-${type}`);
    }

    targetBlock.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const suggestionCard = document.querySelector(
      `[data-issue-id="${position.id}"]`
    );
    if (suggestionCard) {
      suggestionCard.scrollIntoView({ behavior: "smooth", block: "center" });
      suggestionCard.classList.add("suggestion-highlight");
      setTimeout(
        () => suggestionCard.classList.remove("suggestion-highlight"),
        2000
      );
    }
  };

  const handleSendContract = async (
    clientName: string,
    clientEmail: string
  ) => {
    console.log("📨 Preparing to send contract:", {
      clientName,
      clientEmail,
      hasContent: !!editorContent,
      hasSignature: !!localStorage.getItem("contract-signature"),
    });

    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        throw new Error("Contract ID not found");
      }

      // Validate required fields
      if (!clientName || !clientEmail) {
        throw new Error("Client name and email are required");
      }

      // Get the contract title from formData if available
      const contractTitle = formData?.title || "New Contract";

      // Generate a view token using uuid for better uniqueness
      const viewToken = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;

      // Create a more explicit contract view URL that's guaranteed to be allowed in middleware
      const viewUrl = `${window.location.origin}/contract-view/${contractId}?token=${viewToken}`;

      console.log("📨 Sending contract with view URL:", viewUrl);

      // Save the viewToken to localStorage as a backup
      localStorage.setItem(`contract-token-${contractId}`, viewToken);

      const response = await fetch("/api/sendContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName,
          clientEmail,
          to: clientEmail, // Make sure to include 'to' field
          contractId,
          contractTitle,
          content: editorContent,
          signature: localStorage.getItem("contract-signature"),
          viewUrl,
          viewToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ API response error:", data);
        throw new Error(data.error || "Failed to send contract");
      }

      console.log("✅ Contract sent successfully:", data);
      toast.success(
        "Contract sent successfully! You should check spam folder if you don't receive it."
      );
    } catch (error) {
      console.error("❌ Send contract error:", error);
      throw error;
    }
  };

  const handleUnsignClick = () => {
    if (!designerSignature) {
      // If no designer signature, just go to edit mode
      const event = new CustomEvent("stageChange", { detail: "edit" });
      window.dispatchEvent(event);
      return;
    }
    setIsUnsignModalOpen(true);
  };

  // Handle when top buttons are clicked to navigate between stages
  const handleEditStageClick = () => {
    // Check if both signatures are present
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    const hasDesignerSig = !!designerSignature;
    const hasClientSig = !!clientSignature;

    // If designer signature exists, prompt to remove it before editing
    if (hasDesignerSig) {
      // Open the unsign confirmation modal instead of proceeding
      setIsUnsignModalOpen(true);
      return;
    }

    // Otherwise if only client signature exists, show warning
    if (hasClientSig) {
      toast("Editing a signed contract - changes will require re-signing", {
        id: "edit-warning", // Prevent duplicate toasts
        icon: "⚠️",
      });
    }

    // Set flag to indicate this was an explicit edit button click
    localStorage.setItem("explicit-edit-click", "true");

    // Force unlock when going to edit mode
    setIsLocked(false);

    // Force unlock the editor if it exists
    if (editorRef.current) {
      // Direct approach to force editor to be editable
      if (editorRef.current.readOnly?.isEnabled) {
        editorRef.current.readOnly.toggle();
      }

      // Backup approach - directly manipulate DOM to remove readonly attributes
      setTimeout(() => {
        try {
          // Find all editable elements in the editor and remove readonly attributes
          const editorElement = containerRef.current;
          if (editorElement) {
            const editableElements = editorElement.querySelectorAll(
              '[contenteditable="false"]'
            );
            editableElements.forEach((el: Element) => {
              (el as HTMLElement).setAttribute("contenteditable", "true");
            });

            // Remove any pointer-events-none classes
            const lockedElements = editorElement.querySelectorAll(
              ".pointer-events-none"
            );
            lockedElements.forEach((el: Element) => {
              el.classList.remove("pointer-events-none");
            });

            // Hide lock overlays but don't remove them
            const lockOverlay = document.querySelector(
              ".absolute.inset-0.bg-gray-50.bg-opacity-50"
            );
            if (lockOverlay) {
              (lockOverlay as HTMLElement).style.display = "none";
            }

            // Hide lock indicator but don't remove it
            const lockIndicator = document.querySelector(
              ".absolute.top-0.left-0.right-0.bg-gray-100"
            );
            if (lockIndicator) {
              (lockIndicator as HTMLElement).style.display = "none";
            }
          }
        } catch (error) {
          console.error("Error forcing editor to be editable:", error);
        }
      }, 100);
    }

    // Dispatch stage change to edit mode with confirmed flag for reliability
    const eventDetail = {
      stage: "edit",
      confirmed: true,
      source: "explicit-click",
    };
    const event = new CustomEvent("stageChange", { detail: eventDetail });
    window.dispatchEvent(event);
  };

  // Listen for unsign events from any component
  useEffect(() => {
    const handleUnsignEvent = (e: CustomEvent) => {
      // Call our centralized handleUnsign function
      handleUnsign();
    };

    window.addEventListener(
      "unsignContract",
      handleUnsignEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "unsignContract",
        handleUnsignEvent as EventListener
      );
    };
  }, []);

  // Listen for unsign requests from topbar
  useEffect(() => {
    const handleUnsignRequest = (e: CustomEvent) => {
      const source = e.detail?.source || "unknown";
      console.log(`📝 Unsign request received from: ${source}`);

      // If user has a signature, show unsign modal
      if (designerSignature) {
        setIsUnsignModalOpen(true);
      } else {
        // No signature, can safely go to edit mode
        const event = new CustomEvent("stageChange", {
          detail: {
            stage: "edit",
            confirmed: true,
            source: "unsign-request-no-signature",
          },
        });
        window.dispatchEvent(event);
      }
    };

    window.addEventListener(
      "requestUnsignPrompt",
      handleUnsignRequest as EventListener
    );

    return () => {
      window.removeEventListener(
        "requestUnsignPrompt",
        handleUnsignRequest as EventListener
      );
    };
  }, [designerSignature]);

  // Listen for global stage change events
  useEffect(() => {
    const handleStageChange = (e: CustomEvent) => {
      // Support both string and object detail formats
      const newStage =
        typeof e.detail === "string" ? e.detail : e.detail?.stage;
      const isConfirmed = e.detail?.confirmed === true;
      const allowWithSignatures = e.detail?.allowWithSignatures === true;
      const source = e.detail?.source || "unknown";

      console.log(
        `📝 Stage change event received: ${newStage} (source: ${source})`
      );

      // Handle any transition to edit mode
      if (newStage === "edit") {
        // Force unlock the editor explicitly
        setIsLocked(false);

        // If we have a valid editor reference, unlock it
        if (editorRef.current) {
          if (editorRef.current.readOnly?.isEnabled) {
            editorRef.current.readOnly.toggle();
          }

          // Force DOM update to remove readonly attributes
          setTimeout(() => {
            try {
              // Find all editable elements in the editor and remove readonly attributes
              const editorElement = containerRef.current;
              if (editorElement) {
                const editableElements = editorElement.querySelectorAll(
                  '[contenteditable="false"]'
                );
                editableElements.forEach((el: Element) => {
                  (el as HTMLElement).setAttribute("contenteditable", "true");
                });

                // Remove any pointer-events-none classes
                const lockedElements = editorElement.querySelectorAll(
                  ".pointer-events-none"
                );
                lockedElements.forEach((el: Element) => {
                  el.classList.remove("pointer-events-none");
                });

                // Also hide the lock overlay
                const lockOverlay = document.querySelector(
                  ".absolute.inset-0.bg-gray-50.bg-opacity-50"
                );
                if (lockOverlay) {
                  (lockOverlay as HTMLElement).style.display = "none";
                }

                // And hide the top lock indicator
                const lockIndicator = document.querySelector(
                  ".absolute.top-0.left-0.right-0.bg-gray-100"
                );
                if (lockIndicator) {
                  (lockIndicator as HTMLElement).style.display = "none";
                }
              }
            } catch (error) {
              console.error("Error forcing editor to be editable:", error);
            }
          }, 100);
        }
      }
    };

    window.addEventListener("stageChange", handleStageChange as EventListener);

    return () => {
      window.removeEventListener(
        "stageChange",
        handleStageChange as EventListener
      );
    };
  }, []);

  return (
    <div className="content-wrapper relative">
      {!showSuccess && (
        <div className="fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-200">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Saved</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Only show PDF upload in edit stage */}
              {stage === "edit" && (
                <div>
                  <button
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50"
                    onClick={() =>
                      document.getElementById("pdf-upload")?.click()
                    }
                  >
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload PDF
                  </button>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Stage navigation buttons */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  className={`px-3 py-1.5 ${
                    stage === "edit"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={handleEditStageClick}
                >
                  Edit
                </button>
                <button
                  className={`px-3 py-1.5 ${
                    stage === "sign"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={handleSignStageClick}
                >
                  Sign
                </button>
                <button
                  className={`px-3 py-1.5 ${
                    stage === "send"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    const event = new CustomEvent("stageChange", {
                      detail: "send",
                    });
                    window.dispatchEvent(event);
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-12 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Banner image uploader - full width */}
          {!isLocked && stage === "edit" && (
            <div className="mb-6">
              <ImageUploader
                type="banner"
                contractId={window.location.pathname.split("/").pop() || ""}
                imageUrl={bannerUrl}
                onImageChange={(url) => {
                  console.log("Banner image changed to:", url);
                  setBannerUrl(url);
                }}
                className="w-full"
                useDefaultIfEmpty={true}
              />
            </div>
          )}

          {/* Display banner if it exists */}
          {bannerUrl !== "/placeholder-banner.png" && (
            <div className="mb-6">
              <img
                src={
                  bannerUrl +
                  (bannerUrl.includes("?") ? "" : `?t=${Date.now()}`)
                }
                alt="Contract banner"
                className="w-full h-40 object-cover rounded-lg"
                onLoad={() =>
                  console.log("Banner image loaded successfully:", bannerUrl)
                }
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  console.error("Banner image failed to load:", bannerUrl, e);
                  // Reset to default if loading fails
                  if (bannerUrl !== "/placeholder-banner.png") {
                    console.log(
                      "Resetting to default banner after load failure in editor"
                    );
                    setBannerUrl("/placeholder-banner.png");
                  }
                }}
              />
            </div>
          )}

          {/* Logo and header section */}
          <div className="flex items-center mb-6">
            {/* Logo uploader */}
            {!isLocked && stage === "edit" ? (
              <ImageUploader
                type="logo"
                contractId={window.location.pathname.split("/").pop() || ""}
                imageUrl={logoUrl}
                onImageChange={(url) => {
                  console.log("Logo image changed to:", url);
                  setLogoUrl(url);
                }}
                className="mb-12 mr-8"
                useDefaultIfEmpty={true}
              />
            ) : logoUrl !== "/placeholder-logo.png" ? (
              <div className="h-32 w-32 mb-12 mr-8 rounded-lg overflow-hidden">
                <img
                  src={
                    logoUrl + (logoUrl.includes("?") ? "" : `?t=${Date.now()}`)
                  }
                  alt="Contract logo"
                  className="w-full h-full object-cover"
                  onLoad={() =>
                    console.log("Logo image loaded successfully:", logoUrl)
                  }
                  onError={(e) => {
                    console.error("Logo image failed to load:", logoUrl, e);
                    // Reset to default if loading fails
                    if (logoUrl !== "/placeholder-logo.png") {
                      setLogoUrl("/placeholder-logo.png");
                    }
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Editor section with lock overlay */}
          <div className="relative">
            {isLocked && (
              <>
                {/* Prominent top bar indicator */}
                <div className="absolute top-0 left-0 right-0 bg-gray-100 border-y border-gray-200 p-3 flex items-center justify-center z-[2]">
                  <div className="flex items-center gap-2">
                    <LockClosedIcon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Contract locked - go to Draft & Edit mode to make changes
                    </span>
                  </div>
                </div>

                {/* Simple overlay - similar to original */}
                <div className="absolute inset-0 bg-gray-50 bg-opacity-50 pointer-events-none z-[1]"></div>
              </>
            )}
            <div
              ref={containerRef}
              className={`prose max-w-none ${
                isLocked ? "pointer-events-none pt-16" : ""
              }`}
            />
          </div>

          {/* Signatures Display */}
          {(hasSignature || clientSignature) && (
            <div
              className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
              style={{ zIndex: 99999 }}
            >
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-8">
                  {/* Designer Signature */}
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        Designer Signature
                      </p>
                      {designerSignature ? (
                        <>
                          <p className="text-gray-500">
                            {designerSignature.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(
                              designerSignature.signedAt.toDate()
                            ).toLocaleDateString()}
                          </p>
                          <img
                            src={designerSignature.signature}
                            alt="Designer Signature"
                            className="h-16 border-b border-gray-300 mt-2"
                          />
                        </>
                      ) : (
                        <p className="text-gray-400 text-xs">
                          Not currently signed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Client Signature */}
                  <div className="flex items-center gap-4 border-l border-gray-200 pl-8">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        Client Signature
                      </p>
                      {clientSignature ? (
                        <>
                          <p className="text-gray-500">
                            {clientSignature.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(
                              clientSignature.signedAt.toDate()
                            ).toLocaleDateString()}
                          </p>
                          <img
                            src={clientSignature.signature}
                            alt="Client Signature"
                            className="h-16 border-b border-gray-300 mt-2"
                          />
                        </>
                      ) : (
                        <p className="text-gray-400 text-xs">Not signed yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel - only show if not in success state */}
        {!showSuccess && (
          <div
            className="fixed right-8 top-32 w-80 bg-white rounded-lg shadow-sm flex flex-col"
            style={{ zIndex: 99998, height: "calc(100vh - 180px)" }}
          >
            {stage === "edit" && (
              <ContractAudit
                editorContent={editorContent}
                onFixClick={() => onAuditFix?.()}
                onIssueClick={highlightBlock}
              />
            )}
            {stage === "sign" && (
              <SigningStage
                onSign={(signature, name) => {
                  handleSignatureComplete(signature, name);
                }}
                designerSignature={designerSignature}
              />
            )}
            {stage === "send" && !showSuccess && (
              <SendStage
                onSend={handleSendContract}
                title={formData?.title || "Contract"}
              />
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .suggestions-scroll {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        .suggestions-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .suggestions-scroll:hover {
          scrollbar-width: thin;
          -ms-overflow-style: auto;
        }

        .suggestions-scroll:hover::-webkit-scrollbar {
          display: block;
          width: 4px;
        }

        .suggestions-scroll:hover::-webkit-scrollbar-track {
          background: transparent;
        }

        .suggestions-scroll:hover::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 2px;
        }
      `}</style>

      <Modal
        isOpen={isUnsignModalOpen}
        onClose={() => setIsUnsignModalOpen(false)}
        title="Unsign Contract"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            To edit this contract, you must first remove your signature.
            <span className="font-medium">
              {" "}
              Once you edit the contract, you will need to sign it again.
            </span>
          </p>
          <p className="text-gray-500 mb-4 text-sm">
            Editing a signed contract invalidates the previous signature since
            the content is changing.
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setIsUnsignModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleUnsignConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Remove Signature
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

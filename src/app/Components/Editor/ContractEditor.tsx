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
import { saveContract, updateContractStatus } from "@/lib/firebase/firestore";
import {
  saveSignatureToManager,
  removeSignatureFromManager,
} from "@/lib/signature/SignatureManager";
import { ContractAudit } from "./ContractAudit";
import { SigningStage } from "./SigningStage";
import { SendStage } from "./SendStage";
import Modal from "../Modal";

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import confetti from "canvas-confetti";
import { Contract, Signature } from "@/lib/firebase/types";
import DragDrop from "editorjs-drag-drop";
import Image from "@editorjs/image";
import { ContractStatusManager, getStatusManager } from "@/lib/firebase/status";
import { useSignatureState } from "@/lib/hooks/useSignatureState";

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

    // If no contract-specific logo, try to use the current profile image
    // Only use profile image for logo if it's different from banner
    const userId = localStorage.getItem("userId");
    if (userId) {
      const profileImage = localStorage.getItem(`profileImage-${userId}`);
      const profileBanner = localStorage.getItem(`profileBanner-${userId}`);

      // Only use profile image as logo if it's different from banner
      if (profileImage && profileImage !== profileBanner) {
        return profileImage;
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

    // If no contract-specific banner, try to use the current profile banner
    const userId = localStorage.getItem("userId");
    if (userId) {
      const profileBanner = localStorage.getItem(`profileBanner-${userId}`);
      if (profileBanner) {
        return profileBanner;
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
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const saveTimeout = useRef<NodeJS.Timeout>();
  const initialLoadDone = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [showUnsignModal, setShowUnsignModal] = useState(false);
  const [statusManager, setStatusManager] =
    useState<ContractStatusManager | null>(null);

  // Centralized signature state management - ONLY source of truth
  const contractId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : null;
  const { signatureState, canEdit, reason, invalidateCache } =
    useSignatureState({
      contractId: contractId || "",
      autoRefresh: true,
    });

  // Derived state from SignatureManager
  const isLocked = !canEdit;
  const hasSignature = signatureState.hasDesignerSignature;
  const designerSignature = signatureState.designerSignature;
  const clientSignature = signatureState.clientSignature;

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

  // Signature state is now managed by SignatureManager - no local state needed

  // Load user profile data including company name
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        // Fix: Add null check for db
        if (!db) {
          console.error("Firestore not initialized");
          return;
        }

        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.companyName) {
            setCompanyName(userData.companyName);
            // Store in localStorage for future use
            localStorage.setItem(`companyName-${userId}`, userData.companyName);
          }
        } else {
          // Try to get from localStorage as fallback
          const savedCompanyName = localStorage.getItem(
            `companyName-${userId}`
          );
          if (savedCompanyName) {
            setCompanyName(savedCompanyName);
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  // Initialize status manager when contract ID is available
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (contractId) {
      const manager = getStatusManager(contractId);
      setStatusManager(manager);
    }
  }, []);

  // Simplified stage management
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // Use centralized signature state
    const hasDesignerSignature = signatureState.hasDesignerSignature;
    const hasContent = editorContent && Object.keys(editorContent).length > 0;

    // Lock state based on signature status and stage
    let newLockState = false;
    if (stage === "edit") {
      // Edit mode is locked if we have a designer signature
      newLockState = hasDesignerSignature;
    } else if (stage === "sign") {
      // In sign stage, lock if we have a designer signature from any source
      newLockState = hasDesignerSignature;
    } else if (stage === "send") {
      // Send mode is always locked
      newLockState = true;
    }

    // Lock state is now derived from SignatureManager - no manual updates needed

    // State is derived from SignatureManager

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

    // Signature state is now managed by SignatureManager - no manual loading needed
  }, [stage, editorContent, signatureState, isLocked, hasSignature]);

  // Save content to localStorage whenever it changes
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId || !editorContent) return;

    // Set saving status and emit event
    setSaveStatus("saving");
    window.dispatchEvent(
      new CustomEvent("saveStatusChange", { detail: "saving" })
    );

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
        } as any);

        // Update status using the centralized manager
        if (statusManager) {
          try {
            await statusManager.updateStatus("draft", {
              lastActivity: new Date().toISOString(),
              userAgent: navigator.userAgent,
            });
          } catch (statusError) {
            console.warn("Failed to update contract status:", statusError);
          }
        }

        setSaveStatus("saved");
        window.dispatchEvent(
          new CustomEvent("saveStatusChange", { detail: "saved" })
        );
      } catch (error) {
        console.error("Failed to save content:", error);
        setSaveStatus("error");
        window.dispatchEvent(
          new CustomEvent("saveStatusChange", { detail: "error" })
        );
        toast.error("Failed to save changes");
      }
    }, 1000);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [editorContent, logoUrl, bannerUrl, user?.uid, statusManager]);

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

                  // Hide any lock indicators but not the overlays
                  const lockIndicators = document.querySelectorAll(
                    ".absolute.top-0.left-0.right-0.bg-gray-100"
                  );
                  lockIndicators.forEach((el: Element) => {
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
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
          config: {
            placeholder: "Start writing your contract here...",
          },
        },
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

        // Fix EditorJS dropdown styling
        const fixEditorJSDropdownStyling = () => {
          const observer = new MutationObserver(() => {
            // Find all dropdown elements
            const dropdowns = document.querySelectorAll(
              ".ce-toolbar__settings, .ce-popover, .ce-settings"
            );
            dropdowns.forEach((dropdown) => {
              // Target H1 elements in dropdowns
              const h1Elements = Array.from(
                dropdown.querySelectorAll('[data-level="1"]')
              );
              // Also find elements containing "H1 Heading 1" text
              const allElements = dropdown.querySelectorAll("*");
              allElements.forEach((element) => {
                if (element.textContent?.includes("H1 Heading 1")) {
                  h1Elements.push(element);
                }
              });
              h1Elements.forEach((element) => {
                (element as HTMLElement).style.fontSize = "16px";
                (element as HTMLElement).style.fontWeight = "600";
              });

              // Target H2 elements in dropdowns
              const h2Elements = Array.from(
                dropdown.querySelectorAll('[data-level="2"]')
              );
              // Also find elements containing "H2 Heading 2" text
              allElements.forEach((element) => {
                if (element.textContent?.includes("H2 Heading 2")) {
                  h2Elements.push(element);
                }
              });
              h2Elements.forEach((element) => {
                (element as HTMLElement).style.fontSize = "15px";
                (element as HTMLElement).style.fontWeight = "500";
              });
            });
          });

          // Start observing changes
          if (containerRef.current) {
            observer.observe(containerRef.current, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          }

          // Cleanup observer on component unmount
          return () => observer.disconnect();
        };

        // Apply the fix
        const cleanup = fixEditorJSDropdownStyling();

        // Store cleanup function for later use
        (editor as any)._dropdownStylingCleanup = cleanup;

        // Process content to replace placeholders with actual values
        if (companyName && editor && containerRef.current) {
          const paragraphs = containerRef.current.querySelectorAll(
            '[contenteditable="true"]'
          );
          paragraphs.forEach((p) => {
            const text = p.innerHTML;
            if (text && text.includes("[Your Company Name]")) {
              p.innerHTML = text.replace(/\[Your Company Name\]/g, companyName);
            }
          });
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

          // SIMPLIFIED: Check Firestore for signature status
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
        // Cleanup dropdown styling observer
        if ((editorRef.current as any)._dropdownStylingCleanup) {
          (editorRef.current as any)._dropdownStylingCleanup();
        }
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [user?.uid, isLocked, editorContent, onBlockClick, companyName]);

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

      // Send completion notification
      const contractId = window.location.pathname.split("/").pop();
      if (contractId) {
        const sendCompletionNotification = async () => {
          try {
            const { notifyContractComplete } = await import(
              "@/lib/email/notifications"
            );
            const notificationResult = await notifyContractComplete(
              contractId,
              designerSignature.name || "Designer",
              clientSignature.name || "Client"
            );
            if (notificationResult.success) {
              console.log("✅ Completion notifications sent to both parties");
            } else {
              console.warn(
                "⚠️ Failed to send completion notifications:",
                notificationResult.error
              );
            }
          } catch (notificationError) {
            console.warn(
              "⚠️ Error sending completion notifications:",
              notificationError
            );
          }
        };

        sendCompletionNotification();
      }
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

      // Remove signature using SignatureManager
      const result = await removeSignatureFromManager(contractId, "designer");
      if (!result.success) {
        throw new Error(result.error || "Failed to remove signature");
      }

      // State is now managed by SignatureManager - no local updates needed

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
              console.log(
                `🔄 Updated ${editableElements.length} editable elements`
              );

              // Remove any pointer-events-none classes
              const lockedElements = editorElement.querySelectorAll(
                ".pointer-events-none"
              );
              lockedElements.forEach((el: Element) => {
                el.classList.remove("pointer-events-none");
              });
              console.log(
                `🔄 Updated ${lockedElements.length} locked elements`
              );

              // Hide lock indicator but don't remove it
              const lockIndicator = document.querySelector(
                ".absolute.top-0.left-0.right-0.bg-gray-100"
              );
              if (lockIndicator) {
                (lockIndicator as HTMLElement).style.display = "none";
                console.log("🔄 Hidden lock indicator");
              }
            }
          } catch (error) {
            console.error("Error forcing editor to be editable:", error);
          }
        }, 100);
      }

      // Client signature state is managed by SignatureManager

      // Update contract status
      await updateContractStatus(contractId, {
        status: "draft",
        updatedAt: new Date().toISOString(),
      });
      console.log("✅ Contract status updated to draft");

      // Invalidate signature cache to ensure fresh state
      const { signatureManager } = await import(
        "@/lib/signature/SignatureManager"
      );
      signatureManager.invalidateCache(contractId);

      // Refresh internal signature state for any component that might need it
      const refreshEvent = new CustomEvent("signatureStateChanged", {
        detail: {
          contractId,
          hasDesignerSignature: false,
          source: "handleUnsign",
        },
      });
      window.dispatchEvent(refreshEvent);

      // Update status back to draft using centralized manager
      if (statusManager) {
        try {
          await statusManager.updateStatus("draft", {
            lastActivity: new Date().toISOString(),
            userAgent: navigator.userAgent,
          });
        } catch (statusError) {
          console.warn("Failed to update contract status:", statusError);
        }
      }

      // Force stage change to edit mode and update localStorage
      const stageEvent = new CustomEvent("stageChange", {
        detail: { stage: "edit", source: "handleUnsign" },
      });
      window.dispatchEvent(stageEvent);

      // Update localStorage to persist the stage change
      localStorage.setItem(`contract-stage-${contractId}`, "edit");

      toast.success(
        "Signature removed successfully - contract is now editable"
      );
      return true;
    } catch (error) {
      console.error("Error removing signature:", error);
      toast.error("Failed to remove signature");
      return false;
    }
  };

  // Handle switching to sign stage after unsigning
  const handleSignStageClick = () => {
    // If already in sign stage, do nothing
    if (stage === "sign") return;

    console.log("🔄 Switching to sign stage, current signature state:", {
      hasDesignerSignature: !!designerSignature,
      hasSignature,
      stage,
    });

    // Re-check signature status before switching
    const contractId = window.location.pathname.split("/").pop();
    if (contractId) {
      // First switch to sign mode to ensure the UI updates
      const initialEvent = new CustomEvent("stageChange", {
        detail: {
          stage: "sign",
          refreshed: true,
          source: "handleSignStageClick-initial",
        },
      });
      window.dispatchEvent(initialEvent);

      // Clear any cached signature data to ensure we get a fresh state
      localStorage.removeItem(`contract-signature-cache-${contractId}`);

      // Signature state is managed by SignatureManager - no manual operations needed
    } else {
      // Fallback if no contract ID
      const event = new CustomEvent("stageChange", {
        detail: {
          stage: "sign",
          refreshed: true,
          source: "sign-button-click",
        },
      });
      window.dispatchEvent(event);
    }
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

      // SIMPLIFIED: No localStorage - only Firestore

      // Save to Firestore
      const firestoreSignature = {
        contractId,
        userId: user.uid,
        signedAt: new Date(),
        signature,
        name,
      };

      const result = await saveSignatureToManager(
        contractId,
        "designer",
        firestoreSignature
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to save signature");
      }

      // State is now managed by SignatureManager - no local updates needed

      // Update contract status
      await updateContractStatus(contractId, {
        status: "signed",
        updatedAt: new Date().toISOString(),
      });

      // Invalidate signature cache to ensure fresh state
      const { signatureManager } = await import(
        "@/lib/signature/SignatureManager"
      );
      signatureManager.invalidateCache(contractId);

      // Dispatch signature state change event
      const signatureEvent = new CustomEvent("signatureStateChanged", {
        detail: {
          contractId,
          hasDesignerSignature: true,
          source: "handleSignatureComplete",
        },
      });
      window.dispatchEvent(signatureEvent);

      // Trigger stage change to send
      const event = new CustomEvent("stageChange", { detail: "send" });
      window.dispatchEvent(event);

      toast.success("Contract signed successfully!");

      // Send notification to client about designer signature
      try {
        const { notifyClientDesignerSigned } = await import(
          "@/lib/email/notifications"
        );
        const notificationResult = await notifyClientDesignerSigned(
          contractId,
          name
        );
        if (notificationResult.success) {
          console.log("✅ Client notified about designer signature");
        } else {
          console.warn("⚠️ Failed to notify client:", notificationResult.error);
        }
      } catch (notificationError) {
        console.warn("⚠️ Error sending notification:", notificationError);
      }

      // Update status using centralized manager
      if (statusManager) {
        try {
          await statusManager.updateStatus("signed", {
            lastActivity: new Date().toISOString(),
            userAgent: navigator.userAgent,
          });
        } catch (statusError) {
          console.warn("Failed to update contract status:", statusError);
        }
      }
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

  const highlightBlock = (
    position: any,
    type: string,
    targetText?: string,
    isAutoHighlight = false
  ) => {
    console.log("🎯 highlightBlock called:", {
      position,
      type,
      targetText,
      isAutoHighlight,
    });

    // Handle clear highlights request
    if (type === "clear") {
      console.log("🧹 Clearing all highlights");
      clearHighlights();
      return;
    }

    const editorElement = containerRef.current;
    if (!editorElement || !position) {
      console.log("❌ No editor element or position:", {
        editorElement: !!editorElement,
        position,
      });
      return;
    }

    const blocks = editorElement.querySelectorAll(".ce-block");
    console.log("📦 Found blocks:", blocks.length);
    if (!blocks.length) {
      console.log("❌ No blocks found");
      return;
    }

    // Handle both object and number position formats
    const blockIndex =
      typeof position === "number" ? position : position.blockIndex;
    console.log("🔢 Block index:", blockIndex);

    const targetBlock = blocks[blockIndex];
    if (!targetBlock) {
      console.log("❌ Target block not found at index:", blockIndex);
      return;
    }

    console.log("✅ Target block found:", targetBlock);
    console.log("🔍 Target block HTML:", targetBlock.outerHTML);
    console.log("🔍 Target block text content:", targetBlock.textContent);

    // Only highlight specific words if target text is provided
    if (targetText && targetText.trim()) {
      console.log("🎨 Applying text highlighting for:", targetText);
      applyTextHighlighting(targetBlock, targetText, type);
    } else {
      console.log("⚠️ No target text provided for highlighting");
    }

    // Only scroll and pulse on manual clicks (not auto-highlighting)
    if (!isAutoHighlight) {
      console.log("👆 Manual click - scrolling and pulsing");
      // Scroll to the block
      targetBlock.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Pulse the highlighted words
      const highlightedWords = targetBlock.querySelectorAll(
        `.audit-word-highlight-${type}`
      );
      console.log(
        "💫 Found highlighted words to pulse:",
        highlightedWords.length
      );
      highlightedWords.forEach((word) => {
        word.classList.add("audit-pulse");
        setTimeout(() => {
          word.classList.remove("audit-pulse");
        }, 1000);
      });
    } else {
      console.log("🤖 Auto-highlight - no scroll/pulse");
    }
  };

  const applyTextHighlighting = (
    block: Element,
    targetText: string,
    type: string
  ) => {
    console.log("🎨 applyTextHighlighting called:", {
      block,
      targetText,
      type,
    });

    // Get all text content from the entire block, not just contenteditable
    const blockTextContent = block.textContent || "";
    console.log("📝 Block text content:", blockTextContent);
    console.log("🎯 Looking for target text:", targetText);
    console.log("🔍 Target text length:", targetText.length);
    console.log("🔍 Block text length:", blockTextContent.length);

    // Check if target text exists in the entire block
    const targetLower = targetText.toLowerCase();
    const blockLower = blockTextContent.toLowerCase();
    const found = blockLower.includes(targetLower);

    console.log("🔍 Case-insensitive search result:", found);
    if (!found) {
      console.log("❌ Target text not found in block content");
      console.log("🔍 Target text (lowercase):", targetLower);
      console.log("🔍 Block text (lowercase):", blockLower);

      // Try to find partial matches
      const words = targetLower.split(" ");
      console.log("🔍 Target words:", words);
      words.forEach((word, index) => {
        const wordFound = blockLower.includes(word);
        console.log(
          `🔍 Word ${index + 1} "${word}": ${wordFound ? "✅" : "❌"}`
        );
      });

      return;
    }

    console.log("✅ Target text found in block content");

    // Find all text nodes in the block that contain the target text
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      if (
        node.textContent &&
        node.textContent.toLowerCase().includes(targetText.toLowerCase())
      ) {
        textNodes.push(node as Text);
      }
    }

    console.log(
      "🔍 Found text nodes containing target text:",
      textNodes.length
    );

    // Highlight each text node that contains the target text
    textNodes.forEach((textNode) => {
      const textContent = textNode.textContent || "";
      const regex = new RegExp(
        `(${targetText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );

      const highlightedHTML = textContent.replace(regex, (match) => {
        return `<span class="audit-word-highlight audit-word-highlight-${type}" data-highlight-type="${type}">${match}</span>`;
      });

      if (highlightedHTML !== textContent) {
        console.log("✅ Highlighting text node:", textContent);

        // Create a temporary element to parse the HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = highlightedHTML;

        // Replace the text node with the highlighted content
        const parent = textNode.parentNode;
        if (parent) {
          // Insert all child nodes from the temp div
          while (tempDiv.firstChild) {
            parent.insertBefore(tempDiv.firstChild, textNode);
          }
          // Remove the original text node
          parent.removeChild(textNode);
        }
      }
    });

    console.log("🎨 Text highlighting completed");
  };

  const clearHighlights = () => {
    console.log("🧹 clearHighlights called");
    const editorElement = containerRef.current;
    if (!editorElement) {
      console.log("❌ No editor element found for clearing highlights");
      return;
    }

    // Clear word highlights only
    const highlightedWords = editorElement.querySelectorAll(
      ".audit-word-highlight"
    );
    console.log(
      "🗑️ Found highlighted words to clear:",
      highlightedWords.length
    );

    highlightedWords.forEach((word) => {
      const parent = word.parentNode;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(word.textContent || ""),
          word
        );
        parent.normalize(); // Merge adjacent text nodes
      }
    });

    console.log("✅ Highlights cleared");
  };

  const handleAITextReplacement = async (issue: any, originalIndex: number) => {
    if (!editorRef.current) {
      return;
    }

    try {
      // Get full contract context
      const editorData = await editorRef.current.save();
      const fullContract = editorData.blocks
        .map((block: any) => {
          if (block.type === "paragraph") {
            return block.data.text;
          } else if (block.type === "header") {
            return `## ${block.data.text}`;
          } else if (block.type === "list") {
            return block.data.items
              .map((item: string) => `- ${item}`)
              .join("\n");
          }
          return "";
        })
        .join("\n\n");

      // Call OpenAI API to get improved text
      const response = await fetch("/api/improve-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: issue.targetText,
          suggestion: issue.suggestion,
          type: issue.type,
          context: issue.targetText,
          fullContract: fullContract,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI improvement");
      }

      const { improvedText } = await response.json();
      const cleanedText = improvedText.replace(/^"|"$/g, "");
      const blockIndex = issue.position?.blockIndex;

      if (blockIndex === undefined || !editorData.blocks[blockIndex]) {
        return;
      }

      // Show visual effect
      await showAITypingEffect(blockIndex);

      // Update the specific block directly
      try {
        const block = editorRef.current.blocks.getBlockByIndex(blockIndex);
        if (block) {
          const blockElement = block.holder.querySelector(
            '[contenteditable="true"]'
          );
          if (blockElement) {
            blockElement.textContent = cleanedText;
            blockElement.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      } catch (blockError) {
        // Fallback to render method
        const updatedBlocks = [...editorData.blocks];
        updatedBlocks[blockIndex] = {
          ...editorData.blocks[blockIndex],
          data: {
            ...editorData.blocks[blockIndex].data,
            text: cleanedText,
          },
        };
        await editorRef.current.render({ blocks: updatedBlocks });
      }

      // Save the changes
      const contractId = window.location.pathname.split("/").pop();
      if (contractId) {
        await saveContract({
          id: contractId,
          content: editorData,
          updatedAt: new Date(),
        } as any);
      }
      toast.success("AI suggestion applied!");
    } catch (error) {
      console.error("Error applying AI suggestion:", error);
      toast.error("Failed to apply AI suggestion");
    }
  };

  // Simplified AI text replacement - no complex animation needed
  const showAITypingEffect = async (blockIndex: number) => {
    // Find the block element and add a subtle animation
    const editorElement = containerRef.current;
    if (editorElement) {
      const blocks = editorElement.querySelectorAll(".ce-block");
      const targetBlock = blocks[blockIndex];

      if (targetBlock) {
        // Add a subtle glow effect
        const htmlBlock = targetBlock as HTMLElement;
        htmlBlock.style.transition = "all 0.3s ease";
        htmlBlock.style.boxShadow = "0 0 20px rgba(168, 85, 247, 0.3)";

        // Remove the effect after a short delay
        setTimeout(() => {
          htmlBlock.style.boxShadow = "";
        }, 1000);
      }
    }
  };

  // Test function to verify highlighting works
  const testHighlighting = () => {
    console.log("🧪 Testing highlighting...");
    const editorElement = containerRef.current;
    if (!editorElement) {
      console.log("❌ No editor element found");
      return;
    }

    const blocks = editorElement.querySelectorAll(".ce-block");
    console.log("📦 Found blocks:", blocks.length);

    if (blocks.length > 0) {
      const firstBlock = blocks[0];
      console.log("🎯 Testing on first block:", firstBlock);
      console.log("🔍 First block text:", firstBlock.textContent);

      // Test the applyTextHighlighting function directly
      const testText = firstBlock.textContent?.split(" ")[0] || "test";
      console.log("🧪 Testing with text:", testText);

      applyTextHighlighting(firstBlock, testText, "enhancement");
    }
  };

  // Expose test function to window for debugging
  useEffect(() => {
    (window as any).testHighlighting = testHighlighting;
  }, [testHighlighting]);

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
          designerEmail: user?.email, // Include designer email for notifications
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
    // If designer signature exists, redirect to sign stage to handle unsigning
    const event = new CustomEvent("stageChange", { detail: "sign" });
    window.dispatchEvent(event);
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
      // Redirect to sign stage to handle unsigning
      const event = new CustomEvent("stageChange", { detail: "sign" });
      window.dispatchEvent(event);
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

    // Lock state is managed by SignatureManager

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

    // Removed legacy pdfUpload event handler. File processing is handled via primary form input.

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

      // LEGAL PROTECTION: If user has a signature, show confirmation before unsigning
      if (designerSignature) {
        console.log(
          "🚨 LEGAL BLOCK: Signature present, showing unsign confirmation"
        );

        // Show our custom modal instead of browser confirm
        setShowUnsignModal(true);
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

  // Modal handlers for unsign confirmation
  const handleUnsignConfirm = () => {
    setShowUnsignModal(false);
    handleUnsign();
  };

  const handleUnsignCancel = () => {
    setShowUnsignModal(false);
    toast("Signature removal cancelled");
  };

  // Listen for global stage change events
  useEffect(() => {
    const handleStageChange = (e: CustomEvent) => {
      // Support both string and object detail formats
      const newStage =
        typeof e.detail === "string" ? e.detail : e.detail?.stage;
      const isConfirmed = e.detail?.confirmed === true;
      const allowWithSignatures = e.detail?.allowWithSignatures === true;
      const source = e.detail?.source || "unknown";

      // Handle any transition to edit mode
      if (newStage === "edit") {
        // Lock state is managed by SignatureManager

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

                // Hide the top lock indicator (but no longer need to hide overlay since it's removed)
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

  // Add a function to replace placeholders in the editor content
  const replacePlaceholders = () => {
    if (!companyName || !editorRef.current || !containerRef.current) return;

    const editor = editorRef.current;
    const container = containerRef.current;

    const apply = () => {
      const paragraphs = container.querySelectorAll('[contenteditable="true"]');
      paragraphs.forEach((p) => {
        const text = p.innerHTML;
        if (text && text.includes("[Your Company Name]")) {
          p.innerHTML = text.replace(/\[Your Company Name\]/g, companyName);
        }
      });
    };

    // EditorJS exposes isReady as a Promise; handle both promise and immediate
    const isReady = (editor as any).isReady;
    if (isReady && typeof (isReady as any).then === "function") {
      (isReady as Promise<void>).then(() => apply()).catch(() => apply());
    } else {
      apply();
    }
  };

  // Call replacePlaceholders when company name changes
  useEffect(() => {
    replacePlaceholders();
  }, [companyName]);

  return (
    <div className="content-wrapper relative">
      <div className="px-12 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* Banner with overlapping profile image (matches Settings layout) */}
          <div className="mb-12 relative group">
            {bannerUrl !== "/placeholder-banner.png" ? (
              <>
                <img
                  src={
                    bannerUrl +
                    (bannerUrl.includes("?") ? "" : `?t=${Date.now()}`)
                  }
                  alt="Contract banner"
                  className="w-full h-40 object-cover rounded-lg"
                  title="Edit Profile Picture In Settings"
                />
                <div className="absolute inset-0 rounded-lg" />
              </>
            ) : (
              <div
                className="w-full h-40 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center"
                title="Edit Profile Picture In Settings"
              >
                <div className="text-gray-500 text-center">
                  <div className="text-sm font-medium">No banner image</div>
                  <div className="text-xs mt-1">Add one in Settings</div>
                </div>
              </div>
            )}

            {/* Overlapping circular avatar */}
            <div className="absolute -bottom-16 left-6 h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100">
              <img
                src={
                  (logoUrl !== "/placeholder-logo.png"
                    ? logoUrl
                    : "/placeholder-profile.png") +
                  ((logoUrl || "").includes("?") ? "" : `?t=${Date.now()}`)
                }
                alt="Profile image"
                className="w-full h-full object-cover"
                title="Edit Profile Picture In Settings"
              />
            </div>
          </div>
          {/* Spacer to account for the overlapping avatar */}
          <div className="h-8" />

          {/* Editor section with lock indicator (without dimming overlay) */}
          <div className="relative">
            {isLocked && (
              <>
                {/* Prominent top bar indicator */}
                <div className="absolute top-0 left-0 right-0 bg-gray-100 border-y border-gray-200 p-3 flex items-center justify-center lock-indicator">
                  <div className="flex items-center gap-2">
                    <LockClosedIcon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Contract locked - go to Draft & Edit mode to make changes
                    </span>
                  </div>
                </div>
              </>
            )}
            <div
              ref={containerRef}
              className={`prose max-w-none ${
                isLocked ? "pointer-events-none pt-16" : ""
              }`}
            />
          </div>

          {/* Signatures Display - Only show when there are actual signatures */}
          {(designerSignature || clientSignature) && (
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
                      {designerSignature && (
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
                      )}
                    </div>
                  </div>

                  {/* Client Signature */}
                  <div className="flex items-center gap-4 border-l border-gray-200 pl-8">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        Client Signature
                      </p>
                      {clientSignature && (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage-specific components */}
        {stage === "sign" && (
          <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-80 z-50">
            <SigningStage
              onSign={handleSignatureComplete}
              designerSignature={designerSignature}
            />
          </div>
        )}

        {stage === "send" && (
          <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-80 z-50">
            <SendStage
              onSend={() => {
                // Handle send completion
                console.log("Contract sent successfully");
              }}
              title={editorContent?.blocks?.[0]?.data?.text || "Contract"}
            />
          </div>
        )}

        {/* Side panel - only show if not in success state */}
      </div>

      <style jsx global>{`
        .suggestions-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .suggestions-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .suggestions-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .suggestions-scroll::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 3px;
          transition: background-color 0.2s ease;
        }

        .suggestions-scroll:hover::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
        }

        /* Block-level highlights */
        .audit-highlight {
          position: relative;
          transition: all 0.3s ease;
        }

        .audit-highlight::before {
          content: "";
          position: absolute;
          left: -8px;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 2px;
          z-index: 1;
        }

        .audit-highlight-enhancement::before {
          background-color: #8b5cf6;
        }

        .audit-highlight-protection::before {
          background-color: #3b82f6;
        }

        .audit-highlight-clarity::before {
          background-color: #10b981;
        }

        .audit-highlight-communication::before {
          background-color: #f59e0b;
        }

        /* Word-level highlights - selection style */
        .audit-word-highlight {
          background-color: #3b82f6 !important;
          color: white !important;
          padding: 1px 2px !important;
          border-radius: 2px !important;
          display: inline !important;
          font-weight: normal !important;
          text-decoration: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          position: relative !important;
          z-index: 2 !important;
        }

        .audit-word-highlight:hover {
          background-color: #2563eb !important;
          transform: scale(1.05) !important;
        }

        .audit-word-highlight-enhancement {
          background-color: rgba(139, 92, 246, 0.15) !important;
          color: #6b21a8 !important;
          border: 1px solid rgba(139, 92, 246, 0.2) !important;
        }

        .audit-word-highlight-enhancement:hover {
          background-color: rgba(139, 92, 246, 0.25) !important;
        }

        .audit-word-highlight-protection {
          background-color: rgba(59, 130, 246, 0.15) !important;
          color: #1d4ed8 !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
        }

        .audit-word-highlight-protection:hover {
          background-color: rgba(59, 130, 246, 0.25) !important;
        }

        .audit-word-highlight-clarity {
          background-color: rgba(16, 185, 129, 0.15) !important;
          color: #047857 !important;
          border: 1px solid rgba(16, 185, 129, 0.2) !important;
        }

        .audit-word-highlight-clarity:hover {
          background-color: rgba(16, 185, 129, 0.25) !important;
        }

        .audit-word-highlight-communication {
          background-color: rgba(245, 158, 11, 0.15) !important;
          color: #b45309 !important;
          border: 1px solid rgba(245, 158, 11, 0.2) !important;
        }

        .audit-word-highlight-communication:hover {
          background-color: rgba(245, 158, 11, 0.25) !important;
        }

        /* Pulse animation for manual clicks */
        .audit-pulse {
          animation: auditPulse 1.5s ease-in-out;
        }

        @keyframes auditPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
          }
          25% {
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.4);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.2);
          }
          75% {
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
          }
        }

        /* Suggestion card highlight */
        .suggestion-highlight {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }
      `}</style>

      {/* Unsign Confirmation Modal */}
      <Modal
        isOpen={showUnsignModal}
        onClose={handleUnsignCancel}
        title="Remove Signature"
        onConfirm={handleUnsignConfirm}
        confirmText="Remove Signature"
        confirmButtonStyle="bg-red-600 hover:bg-red-700 text-white"
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Legal Warning
              </h3>
              <p className="text-sm text-gray-500">
                This action has legal implications
              </p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              This contract has been signed. Removing the signature will allow
              editing but may have legal implications. Are you sure you want to
              remove your signature?
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

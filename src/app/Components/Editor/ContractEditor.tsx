"use client";

import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import Image from "@editorjs/image";
import DragDrop from "editorjs-drag-drop";
import { useEffect, useRef, useState } from "react";
import { PhotoIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { ContractAudit } from "./ContractAudit";
import { SigningStage } from "./SigningStage";
import { SendStage } from "./SendStage";

interface ContractEditorProps {
  formData: any;
  initialContent: any;
  onAuditFix?: () => void;
  stage?: "edit" | "sign" | "send";
  onStageChange?: (stage: "edit" | "sign" | "send") => void;
}

export function ContractEditor({
  formData,
  initialContent,
  onAuditFix,
  stage = "edit",
  onStageChange,
}: ContractEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [logoUrl, setLogoUrl] = useState(() => {
    const contractId = window.location.pathname.split("/").pop();
    const savedLogo = localStorage.getItem(`contract-logo-${contractId}`);
    return savedLogo || "/placeholder-logo.png";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorContent, setEditorContent] = useState(() => {
    const contractId = window.location.pathname.split("/").pop();
    const savedContent = localStorage.getItem(`contract-content-${contractId}`);
    return savedContent ? JSON.parse(savedContent) : initialContent;
  });
  const [isLocked, setIsLocked] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const initialLoadDone = useRef(false);

  // Check for existing signature on mount only
  useEffect(() => {
    if (!initialLoadDone.current) {
      const savedSignature = localStorage.getItem("contract-signature");
      if (savedSignature) {
        console.log("📝 Found existing signature");
        setHasSignature(true);
        setIsLocked(true);
      }
      initialLoadDone.current = true;
    }
  }, []);

  // Handle stage changes and locking
  useEffect(() => {
    // Only show warning if actively changing from sign to edit
    if (stage === "edit" && hasSignature && initialLoadDone.current) {
      const confirmEdit = window.confirm(
        "Editing the contract will invalidate the current signature. You will need to sign the contract again. Do you want to continue?"
      );

      if (confirmEdit) {
        console.log("🔓 Unlocking contract for editing...");
        setIsLocked(false);
        setHasSignature(false);
        localStorage.removeItem("contract-signature");
      } else {
        console.log("↩️ Reverting back to sign stage...");
        onStageChange?.("sign");
        return;
      }
    }

    // Prevent going to send stage without signature
    if (stage === "send" && !hasSignature) {
      console.log("⚠️ Cannot proceed to send - contract not signed");
      onStageChange?.("sign");
      return;
    }
  }, [stage, hasSignature, onStageChange]);

  // Initialize editor with change handler
  useEffect(() => {
    if (editorRef.current || !containerRef.current) return;

    const editor = new EditorJS({
      holder: containerRef.current,
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
      data: editorContent,
      onReady: () => {
        // Initialize drag-drop functionality
        new DragDrop(editor);
      },
      onChange: async (api) => {
        const content = await api.saver.save();
        setEditorContent(content);
        const contractId = window.location.pathname.split("/").pop();
        localStorage.setItem(
          `contract-content-${contractId}`,
          JSON.stringify(content)
        );
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const handleSignatureComplete = async (signature: string, name: string) => {
    console.log("✍️ Contract signed:", { signature, name });

    try {
      const contractId = window.location.pathname.split("/").pop();
      const signatureData = {
        signature,
        name,
        signedAt: new Date().toISOString(),
      };

      // Save designer signature with contract ID
      const storageKey = `contract-designer-signature-${contractId}`;
      localStorage.setItem(storageKey, JSON.stringify(signatureData));

      console.log("💾 Saved signature data:", {
        key: storageKey,
        data: signatureData,
      });

      // Update states after saving
      setHasSignature(true);
      setIsLocked(true);

      // Save final contract version
      localStorage.setItem(
        `contract-final-${contractId}`,
        JSON.stringify(editorContent)
      );
    } catch (error) {
      console.error("Failed to save signature:", error);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert file to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);

        // Save to localStorage with contract ID
        const contractId = window.location.pathname.split("/").pop();
        localStorage.setItem(`contract-logo-${contractId}`, base64String);
      };
      reader.readAsDataURL(file);
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
      const response = await fetch("/api/sendContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName,
          clientEmail,
          contractId: window.location.pathname.split("/").pop(),
          content: editorContent,
          signature: localStorage.getItem("contract-signature"),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ API response error:", data);
        throw new Error(data.error || "Failed to send contract");
      }

      console.log("✅ Contract sent successfully:", data);
    } catch (error) {
      console.error("❌ Send contract error:", error);
      throw error;
    }
  };

  const handleFinalSign = async () => {
    console.log("✅ handleFinalSign called");
    try {
      // Get the contract ID from the URL
      const contractId = window.location.pathname.split("/").pop();
      console.log("📝 Signing contract:", contractId);

      const signatureData = {
        signature: contractState.designerSignature,
        name: contractState.designerName,
        signedAt: new Date().toISOString(),
      };

      console.log("💾 Saving signature data:", {
        key: `contract-designer-signature-${contractId}`,
        data: signatureData,
      });

      // Save designer signature
      localStorage.setItem(
        `contract-designer-signature-${contractId}`,
        JSON.stringify(signatureData)
      );

      // Update contract status
      localStorage.setItem(`contract-status-${contractId}`, "signed");

      console.log("✨ Signature saved successfully");

      // Verify the save
      const savedData = localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      console.log("🔍 Verification - saved data:", savedData);
    } catch (error) {
      console.error("❌ Error signing contract:", error);
      console.error("Error details:", error);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="max-w-4xl mx-auto relative">
        <div className="px-8">
          {/* Image with same padding as before */}
          <div className="pt-[88px]">
            <div
              onClick={handleImageClick}
              className="h-[8rem] w-[8rem] bg-gray-100 rounded-lg mb-12 ml-[90px] cursor-pointer overflow-hidden hover:opacity-90 transition-opacity relative"
            >
              {logoUrl === "/placeholder-logo.png" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <PhotoIcon className="h-6 w-6" />
                  <span className="text-[10px] mt-1">Add logo</span>
                </div>
              ) : (
                <img
                  src={logoUrl}
                  alt="Contract logo"
                  className="w-full h-full object-cover"
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Editor section with lock overlay */}
          <div className="relative">
            {isLocked && (
              <div className="absolute inset-0 bg-gray-50 bg-opacity-50 pointer-events-none z-10 flex items-center justify-center">
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                  <LockClosedIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Contract locked - signed version
                  </span>
                </div>
              </div>
            )}
            <div
              ref={containerRef}
              className={`prose max-w-none ${
                isLocked ? "pointer-events-none" : ""
              }`}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="fixed right-8 top-32 w-80">
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
              existingSignature={hasSignature}
            />
          )}
          {stage === "send" && <SendStage onSend={handleSendContract} />}
        </div>
      </div>
    </div>
  );
}

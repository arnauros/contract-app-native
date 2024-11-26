"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { ContractEditor } from "@/app/Components/Editor/ContractEditor";
import Skeleton from "@/app/Components/Editor/skeleton";

export default function ContractPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const hasInitialized = useRef(false);
  const [currentStage, setCurrentStage] = useState<"edit" | "sign" | "send">(
    "edit"
  );

  // Handle stage changes
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
      console.log("🎭 Stage change event received:", e.detail);

      // Handle confirmed edit case
      if (e.detail?.stage === "edit" && e.detail?.confirmed) {
        console.log("✅ Processing confirmed edit");
        // Clear signatures
        localStorage.removeItem(`contract-client-signature-${id}`);
        localStorage.removeItem(`contract-designer-signature-${id}`);
        // Update stage
        setCurrentStage("edit");
        localStorage.setItem(`contract-stage-${id}`, "edit");
        return;
      }

      // Handle normal stage changes
      if (typeof e.detail === "string") {
        handleStageChange(e.detail);
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
  }, [currentStage, id]);

  // Safety check for signatures
  useEffect(() => {
    const checkSignatures = () => {
      const clientSig = localStorage.getItem(`contract-client-signature-${id}`);
      const designerSig = localStorage.getItem(
        `contract-designer-signature-${id}`
      );
      const hasSignatures = !!(clientSig || designerSig);

      if (hasSignatures && currentStage === "edit") {
        console.log("🔒 Found signatures - enforcing sign stage");
        setCurrentStage("sign");
        localStorage.setItem(`contract-stage-${id}`, "sign");
      }
    };

    checkSignatures();
  }, [currentStage, id]);

  useEffect(() => {
    if (hasInitialized.current) {
      console.log("🚫 Preventing double initialization");
      return;
    }

    const loadContract = async () => {
      try {
        hasInitialized.current = true;
        console.log("🔄 Loading contract once:", id);

        // Check for existing signatures first
        const clientSig = localStorage.getItem(
          `contract-client-signature-${id}`
        );
        const designerSig = localStorage.getItem(
          `contract-designer-signature-${id}`
        );
        const hasSignatures = !!(clientSig || designerSig);
        console.log("📝 Signature status:", { hasSignatures });

        // Load saved stage
        const savedStage = localStorage.getItem(`contract-stage-${id}`);
        console.log("💾 Saved stage:", savedStage);

        // Determine correct initial stage
        if (hasSignatures) {
          console.log("🔒 Contract has signatures - enforcing sign/send stage");
          setCurrentStage(savedStage === "send" ? "send" : "sign");
        } else {
          console.log("✏️ No signatures - starting in edit stage");
          setCurrentStage("edit");
        }

        // Load contract content (your existing loading logic)
        const savedContract = localStorage.getItem(`contract-content-${id}`);
        if (savedContract) {
          console.log("📄 Found saved contract, loading...");
          setGeneratedContent(JSON.parse(savedContract));
          setIsLoading(false);
          return;
        }

        // If no saved contract, load form data and generate new contract
        const savedData = localStorage.getItem(`contract-${id}`);
        if (!savedData) {
          setIsLoading(false);
          return;
        }

        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);

        // Only generate if we have data and no saved contract
        if (parsedData.projectBrief || parsedData.techStack) {
          const response = await fetch("/api/generateContract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedData),
          });

          if (response.ok) {
            const generated = await response.json();
            // Save the generated contract
            localStorage.setItem(
              `contract-content-${id}`,
              JSON.stringify(generated)
            );
            setGeneratedContent(generated);
          }
        }
      } catch (error) {
        console.error("Loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContract();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ContractEditor
        formData={formData}
        initialContent={generatedContent}
        stage={currentStage}
        onStageChange={handleStageChange}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import FirstStage from "./firststage";
import SecondStage from "./secondstage";
import ThirdStage from "./thirdstage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { saveContract } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";
import { doc, getFirestore } from "firebase/firestore";
import { collection } from "firebase/firestore";

export interface FormData {
  projectBrief: string;
  techStack: string;
  startDate: string;
  endDate: string;
  attachments: File[];
  pdf?: string;
  fileSummaries: { [key: string]: string };
}

interface FormParentProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onStageChange: (stage: number) => void;
}

const FormParent: React.FC<FormParentProps> = ({
  formData,
  setFormData,
  onStageChange,
}) => {
  const [currentStage, setCurrentStage] = useState(1);
  const router = useRouter();
  const TOTAL_STAGES = 3;
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    router.prefetch("/Contracts/[id]");
  }, [router]);

  const handleStageChange = (newStage: number) => {
    if (newStage > 0 && newStage <= TOTAL_STAGES) {
      setCurrentStage(newStage);
      onStageChange(newStage);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in to create a contract");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Generating contract...");
    const startTime = performance.now();

    try {
      console.log("Current user:", user);
      console.log("Form data:", formData);

      // Generate a new document reference with auto-generated ID
      const db = getFirestore();
      const contractRef = doc(collection(db, "contracts"));
      const contractId = contractRef.id;

      // Update loading message
      toast.loading("Generating contract content with AI...", {
        id: loadingToast,
      });

      // Generate contract content using OpenAI with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const aiStartTime = performance.now();
      const response = await fetch("/api/generateContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectBrief: formData.projectBrief,
          techStack: formData.techStack,
          startDate: formData.startDate,
          endDate: formData.endDate,
          pdf: formData.pdf,
          attachments: formData.attachments.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            summary: formData.fileSummaries?.[file.name],
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const aiEndTime = performance.now();
      console.log(
        `AI generation took ${Math.round(aiEndTime - aiStartTime)}ms`
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(data.error || "Failed to generate contract");
      }

      if (!data.blocks) {
        console.error("No blocks in response:", data);
        throw new Error("No contract content generated");
      }

      // Update loading message
      toast.loading("Saving contract to database...", { id: loadingToast });

      const dbStartTime = performance.now();
      const contractData = {
        id: contractId,
        userId: user.uid,
        title:
          data.blocks?.[0]?.type === "header"
            ? data.blocks[0].data.text
            : data.blocks?.[0]?.type === "paragraph"
            ? data.blocks[0].data.text.substring(0, 50) +
              (data.blocks[0].data.text.length > 50 ? "..." : "")
            : "Untitled Contract",
        content: {
          time: Date.now(),
          blocks: data.blocks,
          version: "2.28.2",
        },
        rawContent: {
          projectBrief: formData.projectBrief || "",
          techStack: formData.techStack || "The tech stack includes ",
          startDate: formData.startDate || "",
          endDate: formData.endDate || "",
          pdf: formData.pdf || "",
          attachments: await Promise.all(
            (formData.attachments || []).map(async (file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              summary: formData.fileSummaries?.[file.name],
            }))
          ),
        },
        status: "draft" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      console.log("Saving contract with data:", contractData);
      const result = await saveContract(contractData);
      const dbEndTime = performance.now();
      console.log(
        `Database save took ${Math.round(dbEndTime - dbStartTime)}ms`
      );

      if (result.error) {
        console.error("Error saving contract:", result.error);
        toast.error(result.error, { id: loadingToast });
      } else {
        console.log("Contract saved successfully:", result);
        // Save to localStorage before redirecting
        localStorage.setItem(
          `contract-content-${contractId}`,
          JSON.stringify({
            time: Date.now(),
            blocks: data.blocks,
            version: "2.28.2",
          })
        );

        const totalTime = performance.now() - startTime;
        console.log(
          `Total contract generation took ${Math.round(totalTime)}ms`
        );

        toast.success(
          `Contract created successfully! (${Math.round(totalTime)}ms)`,
          { id: loadingToast }
        );
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          router.push(`/Contracts/${contractId}`);
        }, 100);
      }
    } catch (error: any) {
      console.error("Error creating contract:", error);

      const totalTime = performance.now() - startTime;
      console.log(
        `Contract generation failed after ${Math.round(totalTime)}ms`
      );

      // Handle timeout errors specifically
      if (error.name === "AbortError") {
        toast.error("Contract generation timed out. Please try again.", {
          id: loadingToast,
        });
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to create contract",
          { id: loadingToast }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (
    processedFiles: Array<{ file: File; summary?: string }>
  ) => {
    const newSummaries = { ...formData.fileSummaries };
    processedFiles.forEach((pf) => {
      if (pf.summary) {
        newSummaries[pf.file.name] = pf.summary;
      }
    });

    setFormData({
      ...formData,
      attachments: [
        ...formData.attachments,
        ...processedFiles.map((pf) => pf.file),
      ],
      fileSummaries: newSummaries,
    });
  };

  const handleDeleteFile = (index: number) => {
    const fileToDelete = formData.attachments[index];
    const updatedAttachments = formData.attachments.filter(
      (_, i) => i !== index
    );
    const updatedSummaries = { ...formData.fileSummaries };
    if (fileToDelete && updatedSummaries[fileToDelete.name]) {
      delete updatedSummaries[fileToDelete.name];
    }

    setFormData({
      ...formData,
      attachments: updatedAttachments,
      fileSummaries: updatedSummaries,
    });
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="relative">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Creating contract...</span>
        </div>
      ) : (
        <>
          {currentStage === 1 && (
            <FirstStage
              projectBrief={formData.projectBrief}
              onProjectBriefChange={(value: string) =>
                setFormData({ ...formData, projectBrief: value })
              }
              onNext={() => handleStageChange(2)}
              onFileUpload={handleFileUpload}
              attachments={formData.attachments}
              onDeleteFile={handleDeleteFile}
            />
          )}
          {currentStage === 2 && (
            <SecondStage
              onBack={() => handleStageChange(1)}
              onNext={() => handleStageChange(3)}
              techStackText={formData.techStack}
              onTechStackChange={(value: string) =>
                setFormData({ ...formData, techStack: value })
              }
            />
          )}
          {currentStage === 3 && (
            <ThirdStage
              onBack={() => handleStageChange(2)}
              onNext={handleSubmit}
              startDate={formData.startDate}
              endDate={formData.endDate}
              onDateChange={handleDateChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default FormParent;

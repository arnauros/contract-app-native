"use client";

import { useState } from "react";
import FirstStage from "./firststage";
import SecondStage from "./secondstage";
import ThirdStage from "./thirdstage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const FormParent = ({ formData, setFormData, onStageChange }) => {
  const [currentStage, setCurrentStage] = useState(1);
  const router = useRouter();
  const TOTAL_STAGES = 3;
  const [isLoading, setIsLoading] = useState(false);

  // Add this useEffect for prefetching
  useEffect(() => {
    // Prefetch the contracts page
    router.prefetch("/Contracts/[id]");
  }, []); // Empty dependency array means this runs once when component mounts

  const handleStageChange = (newStage: number) => {
    if (newStage > 0 && newStage <= TOTAL_STAGES) {
      setCurrentStage(newStage);
      onStageChange(newStage);
    }
  };

  const handleSubmit = async () => {
    const contractId = Math.random().toString(36).substr(2, 9);

    // Format the data properly before saving
    const contractData = {
      projectBrief: formData.projectBrief || "",
      techStack: formData.techStack || "The tech stack includes ",
      startDate: formData.startDate || "",
      endDate: formData.endDate || "",
      attachments: formData.attachments.map((att) => ({
        summary: att.summary || "",
        type: att.type || "brief",
      })),
      status: "draft",
      id: contractId,
      createdAt: new Date().toISOString(),
    };

    // Clear any existing content for this new contract
    localStorage.removeItem(`contract-content-${contractId}`);
    localStorage.removeItem(`contract-logo-${contractId}`);
    localStorage.removeItem(`contract-signature-${contractId}`);

    // Save the new contract data
    localStorage.setItem(
      `contract-${contractId}`,
      JSON.stringify(contractData)
    );

    router.push(`/Contracts/${contractId}`);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...Array.from(files)],
      });
    }
  };

  const handleDeleteFile = (index: number) => {
    const updatedAttachments = formData.attachments.filter(
      (_, i) => i !== index
    );
    setFormData({ ...formData, attachments: updatedAttachments });
  };

  return (
    <div className="relative">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Generating contract...</span>
        </div>
      ) : (
        <>
          {currentStage === 1 && (
            <FirstStage
              projectBrief={formData.projectBrief}
              onProjectBriefChange={(value) =>
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
              onTechStackChange={(value) =>
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
              onDateChange={(field, value) =>
                setFormData({ ...formData, [field]: value })
              }
            />
          )}
        </>
      )}
    </div>
  );
};

export default FormParent;

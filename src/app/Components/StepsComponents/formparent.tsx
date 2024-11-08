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
    const mockContractId = Math.random().toString(36).substr(2, 9);

    // Save initial form data without the generated contract
    localStorage.setItem(
      `contract_${mockContractId}`,
      JSON.stringify({
        ...formData,
        status: "generating", // Add status to track generation state
        id: mockContractId,
      })
    );

    // Navigate immediately
    router.push(`/Contracts/${mockContractId}`);
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

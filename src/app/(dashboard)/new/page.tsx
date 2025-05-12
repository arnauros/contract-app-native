"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { saveContract } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import FormParent from "@/app/Components/StepsComponents/formparent";

export default function NewContractPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    projectBrief: "",
    techStack: "The tech stack includes ",
    startDate: "",
    endDate: "",
    attachments: [] as Array<{
      file: File;
      summary?: string;
    }>,
  });

  const handleSaveContract = async (contractData) => {
    const { user } = useAuth();
    if (!user) {
      toast.error("You must be logged in to save a contract.");
      return;
    }

    const result = await saveContract({
      userId: user.uid,
      title: "New Contract",
      content: contractData,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Contract saved successfully!");
      router.push(`/Contracts/${result.contractId}`);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      console.log("Form submitted with data:", formData); // Debug log

      const result = await saveContract({
        userId: user?.uid,
        title: formData.projectBrief
          ? formData.projectBrief.split("\n")[0].substring(0, 50) +
            (formData.projectBrief.length > 50 ? "..." : "")
          : "Untitled Contract",
        content: formData,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      console.log("Save result:", result); // Debug log

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Contract saved!");
        router.push(`/Contracts/${result.contractId}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to save contract");
    }
  };

  return (
    <main className="h-[calc(100vh-var(--topbar-height))] px-[calc(6rem)] pt-[20vh] relative">
      <div className="mx-auto max-w-full h-full flex items-center">
        <div className="w-full grid grid-cols-2 gap-8">
          <div className="flex items-center">
            <div className="flex flex-col space-y-12 max-w-[25rem]">
              <div className="text-left">
                <h1 className="text-5xl">Create and send a contract.</h1>
              </div>

              <FormParent
                onStageChange={setCurrentStep}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSaveContract}
              />

              <div className="flex justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Step {currentStep} of 3
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`w-2 h-2 rounded-full ${
                          step === currentStep ? "bg-gray-800" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Add any additional UI components here */}
        </div>
      </div>
    </main>
  );
}

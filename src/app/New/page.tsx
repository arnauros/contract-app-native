"use client";

import { useState } from "react";
import FormParent from "@/app/Components/StepsComponents/formparent";
import { usePathname } from "next/navigation";

export default function NewContractPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    projectBrief: "",
    techStack: "The tech stack includes ",
    startDate: "",
    endDate: "",
    attachments: [] as File[],
  });

  const pathname = usePathname();

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

          {/* Right Column - Console Log */}
          <div className="absolute right-0 top-0 mt-20 mr-8 bg-gray-800 text-white p-4 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-2">Console Log</h2>
            <pre className="text-sm whitespace-pre-wrap break-words">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}

import React from "react";
import TopHeading from "./headerform";
import FormFooter from "./formfooter";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface ThirdStageProps {
  onBack: () => void;
  onNext: () => void;
  startDate: string;
  endDate: string;
  onDateChange: (field: string, value: string) => void;
}

const ThirdStage: React.FC<ThirdStageProps> = ({
  onBack,
  onNext,
  startDate,
  endDate,
  onDateChange,
}) => {
  const handleDownloadPDF = async () => {
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        throw new Error("Contract ID not found");
      }

      // Get the contract content from localStorage
      const savedContent = localStorage.getItem(
        `contract-content-${contractId}`
      );
      if (!savedContent) {
        throw new Error("No contract content found");
      }

      // Call the API to generate PDF
      const response = await fetch("/api/generatePDF", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId,
          content: JSON.parse(savedContent),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contract-${contractId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg border border-solid shadow-xl border-slate-300 max-w-[25rem]">
      <TopHeading title="What's your timeline?" />
      <div className="p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange("startDate", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange("endDate", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500"
            />
          </div>
          <div className="pt-4">
            <button
              onClick={handleDownloadPDF}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
      <FormFooter onNext={onNext} onBack={onBack} />
    </div>
  );
};

export default ThirdStage;

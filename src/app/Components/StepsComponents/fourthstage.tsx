import React from "react";
import TopHeading from "./headerform";
import FormFooter from "./formfooter";

interface FourthStageProps {
  onBack: () => void;
  onNext: () => void;
  clientName: string;
  clientEmail: string;
  onClientInfoChange: (field: string, value: string) => void;
}

const FourthStage: React.FC<FourthStageProps> = ({
  onBack,
  onNext,
  clientName,
  clientEmail,
  onClientInfoChange,
}) => {
  return (
    <div className="flex flex-col bg-white rounded-lg border border-solid shadow-xl border-slate-300 max-w-[25rem]">
      <div className="flex items-center justify-between bg-gray-50 rounded-t-lg">
        <TopHeading title="Client Information" />
      </div>
      <div className="p-4 space-y-6">
        <div>
          <label className="block text-gray-700 text-base mb-2">
            Client Name
          </label>
          <input
            type="text"
            value={clientName || ""}
            onChange={(e) => onClientInfoChange("clientName", e.target.value)}
            placeholder="Enter client name"
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-gray-600 focus:outline-none focus:border-[#B4B4B4]"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-base mb-2">
            Client Email
          </label>
          <input
            type="email"
            value={clientEmail || ""}
            onChange={(e) => onClientInfoChange("clientEmail", e.target.value)}
            placeholder="Enter client email"
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-gray-600 focus:outline-none focus:border-[#B4B4B4]"
          />
        </div>
      </div>
      <FormFooter onNext={onNext} onBack={onBack} isLastStage={true} />
    </div>
  );
};

export default FourthStage;

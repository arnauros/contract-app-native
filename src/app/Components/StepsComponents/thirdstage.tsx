import React from "react";
import TopHeading from "./headerform";
import FormFooter from "./formfooter";

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
        </div>
      </div>
      <FormFooter onNext={onNext} onBack={onBack} />
    </div>
  );
};

export default ThirdStage;

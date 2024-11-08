import React from "react";
import TopHeading from "./headerform";
import { PaperClipIcon } from "@heroicons/react/24/outline";
import FormFooter from "./formfooter";
import Button from "../button";

interface FirstStageProps {
  projectBrief: string;
  onProjectBriefChange: (value: string) => void;
  onNext: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  onDeleteFile: (index: number) => void;
}

const FirstStage: React.FC<FirstStageProps> = ({
  projectBrief,
  onProjectBriefChange,
  onNext,
  onFileUpload,
  attachments,
  onDeleteFile,
}) => {
  return (
    <div className="flex flex-col bg-white rounded-lg border border-solid shadow-xl border-slate-300 max-w-[25rem]">
      <div className="flex items-center justify-between bg-gray-50 rounded-t-lg">
        <TopHeading title="What's your project about?" />
      </div>
      <textarea
        value={projectBrief}
        onChange={(e) => onProjectBriefChange(e.target.value)}
        placeholder="I am doing a project about..."
        className="p-4 border-white w-full h-[220px] focus:outline-none resize-none"
      />
      <FormFooter
        onNext={onNext}
        onFileUpload={onFileUpload}
        attachments={attachments}
        onDeleteFile={onDeleteFile}
      />
    </div>
  );
};

export default FirstStage;

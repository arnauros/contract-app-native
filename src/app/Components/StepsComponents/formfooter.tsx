import React from "react";
import { PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";

interface FormFooterProps {
  onNext: () => void;
  onBack?: () => void;
  onFileUpload?: (files: FileList | null) => void;
  attachments?: File[];
  onDeleteFile?: (index: number) => void;
  isLastStage?: boolean;
}

const FormFooter: React.FC<FormFooterProps> = ({
  onNext,
  onBack,
  onFileUpload,
  attachments = [],
  onDeleteFile,
  isLastStage = false,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onFileUpload && e.target.files) {
      console.log("Files selected:", e.target.files);
      onFileUpload(e.target.files);
      e.target.value = "";
    } else {
      console.log("No files selected or onFileUpload is not defined");
    }
  };

  return (
    <div className="flex flex-col w-full border-t border-gray-200">
      {/* Display uploaded files */}
      {attachments && attachments.length > 0 && (
        <div className="px-4 py-2">
          <div className="text-sm text-gray-600 mb-2">Files added:</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-md text-sm"
              >
                <PaperClipIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  {file.name.length > 20
                    ? `${file.name.substring(0, 20)}...`
                    : file.name}
                </span>
                <button
                  onClick={() => onDeleteFile?.(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex items-center gap-2 p-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 bg-[#1E1E1E] text-white py-3 px-4 rounded-md text-center"
        >
          {isLastStage ? "Submit" : "Next"}
        </button>
        {onFileUpload && (
          <label className="cursor-pointer bg-gray-50 p-3 rounded-md">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx"
            />
            <PaperClipIcon className="h-5 w-5 text-gray-500" />
          </label>
        )}
      </div>
    </div>
  );
};

export default FormFooter;

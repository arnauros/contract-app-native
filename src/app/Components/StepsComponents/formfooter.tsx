import React, { useState } from "react";
import { PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import Button from "@/app/Components/button";

interface FormFooterProps {
  onNext: () => void;
  onBack?: () => void;
  onFileUpload?: (files: any[]) => void;
  attachments?: any[];
  onDeleteFile?: (index: number) => void;
  isLastStage?: boolean;
}

// Add a new interface for tracking file processing status
interface FileWithStatus {
  file: File;
  summary?: string;
  isLoading: boolean;
}

const FormFooter: React.FC<FormFooterProps> = ({
  onNext,
  onBack,
  onFileUpload,
  attachments = [],
  onDeleteFile,
  isLastStage = false,
}) => {
  // Track files and their loading states
  const [processingFiles, setProcessingFiles] = useState<FileWithStatus[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onFileUpload && e.target.files) {
      const files = Array.from(e.target.files);

      // Immediately show files with loading state
      const newFiles = files.map((file) => ({ file, isLoading: true }));
      setProcessingFiles((prev) => [...prev, ...newFiles]);

      const processFiles = files.map(async (file, index) => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/process-document", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Update loading state when processing is complete
          setProcessingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, isLoading: false, summary: data.summary }
                : f
            )
          );

          return {
            file,
            summary: data.summary,
          };
        } catch (error) {
          setProcessingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, isLoading: false, summary: `Error: ${error.message}` }
                : f
            )
          );
          return {
            file,
            summary: `Error processing file: ${error.message}`,
          };
        }
      });

      const results = await Promise.all(processFiles);
      onFileUpload(results);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col w-full border-t border-gray-200">
      {/* Display uploaded files */}
      {processingFiles.length > 0 && (
        <div className="px-4 py-2">
          <div className="text-sm text-gray-600 mb-2">Files added:</div>
          <div className="flex flex-wrap gap-2">
            {processingFiles.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-md text-sm"
              >
                <PaperClipIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  {attachment.file.name.length > 20
                    ? `${attachment.file.name.substring(0, 20)}...`
                    : attachment.file.name}
                </span>
                {attachment.isLoading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                ) : (
                  <button
                    onClick={() => {
                      setProcessingFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
                      onDeleteFile?.(index);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex items-center gap-2 p-4">
        {onBack && (
          <Button
            onClick={onBack}
            fullWidth={true}
            className="bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            Back
          </Button>
        )}
        <Button onClick={onNext} fullWidth={true}>
          {isLastStage ? "Submit" : "Next"}
        </Button>
        {onFileUpload && (
          <label className="cursor-pointer bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors">
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

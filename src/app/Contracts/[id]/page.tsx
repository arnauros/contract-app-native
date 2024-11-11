"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { ContractEditor } from "@/app/Components/Editor/ContractEditor";
import Skeleton from "@/app/Components/Editor/skeleton";
import { ContractBlock } from "@/app/Components/ContractBlock";

export default function ContractPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const hasInitialized = useRef(false);
  const [selectedIssues, setSelectedIssues] = useState<AuditIssue[]>([]);
  const [auditResults, setAuditResults] = useState<{
    issues: AuditIssue[];
    groupedIssues: BlockIssues;
  }>();

  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) {
      console.log("🚫 Preventing double initialization");
      return;
    }

    const loadContract = async () => {
      try {
        hasInitialized.current = true;
        console.log("🔄 Loading contract once:", id);

        const savedData = localStorage.getItem(`contract-${id}`);
        if (!savedData) {
          setIsLoading(false);
          return;
        }

        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);

        // Only generate if we have data and haven't generated yet
        if (
          (parsedData.projectBrief || parsedData.techStack) &&
          !generatedContent
        ) {
          const response = await fetch("/api/generateContract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedData),
          });

          if (response.ok) {
            const generated = await response.json();
            setGeneratedContent(generated);
          }
        }
      } catch (error) {
        console.error("Loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContract();
  }, []); // Empty dependency array

  const handleIssueClick = (issues: AuditIssue[]) => {
    setSelectedIssues(issues);
    // Show issues panel or modal
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <ContractBlock
              key={index}
              block={block}
              issues={auditResults?.groupedIssues[index]}
              onClick={handleIssueClick}
            />
          ))}
        </div>

        {/* Add a sliding panel or modal to show selected issues */}
        {selectedIssues.length > 0 && (
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Suggested Changes</h3>
            <div className="space-y-4">
              {selectedIssues.map((issue, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500">
                    {issue.type}
                  </span>
                  <p className="mt-1">{issue.text}</p>
                  {issue.suggestion && (
                    <p className="mt-2 text-green-600">{issue.suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

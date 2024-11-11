import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

interface AuditIssue {
  type: "spelling" | "rewording" | "upsell" | "general";
  text: string;
  suggestion?: string;
  position: {
    blockIndex: number;
    start: number;
    end: number;
  };
}

interface AuditSummary {
  total: number;
  rewordings: number;
  spelling: number;
  upsell: number;
}

interface AuditResponse {
  issues: AuditIssue[];
  summary: AuditSummary;
}

interface ContractAuditProps {
  editorContent?: any;
  onFixClick: () => void;
  onIssueClick: (blockIndex: number) => void;
}

export function ContractAudit({
  editorContent,
  onFixClick,
  onIssueClick,
}: ContractAuditProps) {
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scanDocument = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auditContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blocks: editorContent.blocks }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate the response structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format");
      }

      setAuditData(data);
    } catch (error) {
      console.error("Audit failed:", error);
      // Set empty audit data instead of null
      setAuditData({
        issues: [],
        summary: {
          total: 0,
          rewordings: 0,
          spelling: 0,
          upsell: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run audit when editor content changes
  useEffect(() => {
    if (editorContent?.blocks) {
      scanDocument();
    }
  }, [editorContent]);

  // Add this helper function to get colors based on type
  const getTypeStyles = (type: string) => {
    switch (type) {
      case "spelling":
        return "bg-red-50 border-l-4 border-red-400";
      case "rewording":
        return "bg-blue-50 border-l-4 border-blue-400";
      case "upsell":
        return "bg-green-50 border-l-4 border-green-400";
      default:
        return "bg-gray-50 border-l-4 border-gray-400";
    }
  };

  const handleIssueClick = (position: any) => {
    console.log("Issue clicked:", position); // Debug log
    if (typeof onIssueClick === "function") {
      onIssueClick(position);
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
      {/* Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-0">
        <h2 className="text-gray-900 text-xl font-semibold mb-4">
          Contract Audit
        </h2>
        <div className="space-y-3">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-gray-500" />
                <span>{auditData?.summary.total || 0} suggestions found</span>
              </div>
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                <span>
                  {auditData?.summary.rewordings || 0} rewording recommended
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                <span>{auditData?.summary.spelling || 0} Spelling errors</span>
              </div>
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                <span>{auditData?.summary.upsell || 0} Upsell potentials</span>
              </div>
            </>
          )}
        </div>
        <button
          onClick={onFixClick}
          disabled={isLoading || !auditData?.issues.length}
          className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm 
            ${
              isLoading || !auditData?.issues.length
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-50"
            } 
            transition-colors`}
        >
          {isLoading ? "Analyzing..." : "Fix for me"}
        </button>
      </div>

      {/* Suggestions Card */}
      {!isLoading && auditData?.issues && auditData.issues.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-gray-700 text-lg font-medium mb-4 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            Suggestions
          </h2>
          <div className="space-y-4">
            {auditData.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-colors ${getTypeStyles(
                  issue.type
                )}`}
                onClick={() => {
                  console.log("Clicking issue:", issue); // Debug log
                  handleIssueClick(issue.position);
                }}
              >
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {issue.text}
                </div>
                {issue.suggestion && (
                  <div className="text-sm text-gray-600">
                    Suggestion: {issue.suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

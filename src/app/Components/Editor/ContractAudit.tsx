import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState, useCallback } from "react";

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
  onIssueClick: (blockIndex: number, type: string) => void;
}

export function ContractAudit({
  editorContent,
  onFixClick,
  onIssueClick,
}: ContractAuditProps) {
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScannedContent, setLastScannedContent] = useState<string>("");

  // Function to highlight all issues simultaneously
  const highlightAllIssues = (issues: AuditIssue[]) => {
    // Remove any existing highlights first
    document.querySelectorAll(".ce-block").forEach((el) => {
      el.classList.remove(
        "audit-highlight",
        "audit-highlight-general",
        "audit-highlight-rewording",
        "audit-highlight-spelling",
        "audit-highlight-upsell",
        "focused"
      );
    });

    // Add highlights to all relevant blocks with their specific types
    const blocks = document.querySelectorAll(".ce-block");
    issues.forEach((issue) => {
      const targetBlock = blocks[issue.position.blockIndex];
      if (targetBlock) {
        targetBlock.classList.add("audit-highlight");
        targetBlock.classList.add(`audit-highlight-${issue.type}`);
      }
    });
  };

  // Debounced scan function using useCallback
  const debouncedScanDocument = useCallback(
    async (content: any) => {
      // Convert content to string for comparison
      const contentString = JSON.stringify(content);

      // Check if content has changed
      if (contentString === lastScannedContent) {
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/auditContract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ blocks: content.blocks }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAuditData(data);
        setLastScannedContent(contentString);

        // Highlight all issues immediately when data loads
        if (data?.issues?.length > 0) {
          highlightAllIssues(data.issues);
        }
      } catch (error) {
        console.error("Audit failed:", error);
        setAuditData({
          issues: [],
          summary: { total: 0, rewordings: 0, spelling: 0, upsell: 0 },
        });
      } finally {
        setIsLoading(false);
      }
    },
    [lastScannedContent]
  );

  // Use effect with debounce
  useEffect(() => {
    if (editorContent?.blocks) {
      const timeoutId = setTimeout(() => {
        debouncedScanDocument(editorContent);
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [editorContent, debouncedScanDocument]);

  // Add this helper function to get colors based on type
  const getTypeStyles = (type: string) => {
    switch (type) {
      case "spelling":
        return "bg-red-50 border-l-4 border-red-500";
      case "rewording":
        return "bg-purple-50 border-l-4 border-purple-500";
      case "upsell":
        return "bg-green-50 border-l-4 border-green-500";
      default:
        return "bg-amber-50 border-l-4 border-amber-500";
    }
  };

  const handleIssueClick = (issue: AuditIssue) => {
    if (typeof onIssueClick === "function") {
      onIssueClick(issue.position, issue.type);
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-180px)] flex flex-col">
      {/* Summary Card - Now outside of scroll container */}
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 p-6 flex-shrink-0">
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
                <DocumentTextIcon className="w-5 h-5 text-purple-500" />
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

      {/* Suggestions Card - Now in scrollable container */}
      {!isLoading && auditData?.issues && auditData.issues.length > 0 && (
        <div className="overflow-y-auto flex-grow">
          <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 p-6">
            <h2 className="text-gray-700 text-lg font-medium mb-4 flex items-center gap-2">
              <LightBulbIcon className="w-5 h-5 text-amber-500" />
              Suggestions
            </h2>
            <div className="space-y-4">
              {auditData.issues
                .sort((a, b) => a.position.blockIndex - b.position.blockIndex)
                .map((issue, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-00 transition-colors ${getTypeStyles(
                      issue.type
                    )}`}
                    onClick={() => handleIssueClick(issue)}
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
        </div>
      )}
    </div>
  );
}

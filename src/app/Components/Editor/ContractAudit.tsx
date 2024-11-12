import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";

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
  const [lastScannedContent, setLastScannedContent] = useState<string | null>(
    null
  );
  const [completedSuggestions, setCompletedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [highlightedBlocks, setHighlightedBlocks] = useState<Set<number>>(
    new Set()
  );

  const handleIssueClick = (issue: AuditIssue) => {
    console.log("🎯 Issue clicked:", issue);

    setHighlightedBlocks(
      (prev) => new Set([...prev, issue.position.blockIndex])
    );

    if (onIssueClick) {
      onIssueClick(issue.position, issue.type);
    }

    const suggestionCard = document.querySelector(
      `[data-issue-id="${issue.id}"]`
    );
    if (suggestionCard) {
      suggestionCard.scrollIntoView({ behavior: "smooth", block: "center" });
      suggestionCard.classList.add("suggestion-highlight");
      setTimeout(
        () => suggestionCard.classList.remove("suggestion-highlight"),
        2000
      );
    }
  };

  const highlightBlock = (position: any, type: string) => {
    if (!position?.blockIndex || position.blockIndex < 0) {
      console.log("⚠️ Invalid block index:", position);
      return;
    }

    console.log("🎨 Highlighting block:", { position, type });

    // Get the editor container
    const editorElement = document.querySelector(".ce-block");
    if (!editorElement) {
      console.log("❌ Editor element not found");
      return;
    }

    // Find all blocks
    const blocks = document.querySelectorAll(".ce-block");
    const targetBlock = blocks[position.blockIndex];

    if (!targetBlock) {
      console.log("❌ Target block not found at index:", position.blockIndex);
      return;
    }

    // Remove existing highlight classes
    targetBlock.classList.remove(
      "audit-highlight-general",
      "audit-highlight-rewording",
      "audit-highlight-spelling",
      "audit-highlight-upsell"
    );

    // Add new highlight class
    targetBlock.classList.add("audit-highlight");
    targetBlock.classList.add(`audit-highlight-${type}`);

    // Scroll block into view
    targetBlock.scrollIntoView({ behavior: "smooth", block: "center" });

    console.log("✅ Successfully highlighted block:", targetBlock);
  };

  const highlightAllIssues = (issues: AuditIssue[]) => {
    console.log("🎨 Attempting to highlight all issues:", issues);
    issues.forEach((issue) => {
      console.log("📍 Highlighting block at index:", issue.position.blockIndex);
      highlightBlock(issue.position, issue.type);
    });
  };

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

  const scanDocument = useCallback(
    async (content: any) => {
      if (!content?.blocks) return;

      const contentString = JSON.stringify(content);
      if (contentString === lastScannedContent) {
        console.log("📝 Content unchanged, skipping scan");
        return;
      }

      try {
        setIsLoading(true);
        console.log("🚀 Sending request to audit endpoint");

        const response = await fetch("/api/auditContract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: content.blocks }),
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log("✅ Received audit data:", data);

        if (data?.issues?.length > 0) {
          console.log("💾 Storing suggestions:", data.issues);
          localStorage.setItem(
            "contractAuditSuggestions",
            JSON.stringify(data.issues)
          );
        }

        setAuditData(data);
        setLastScannedContent(contentString);

        if (data?.issues?.length > 0) {
          highlightAllIssues(data.issues);
        }
      } catch (error) {
        console.error("❌ Audit failed:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [lastScannedContent]
  );

  const debouncedScanDocument = useMemo(
    () => debounce(scanDocument, 1000),
    [scanDocument]
  );

  useEffect(() => {
    if (!editorContent || isLoading) return;

    debouncedScanDocument(editorContent);

    return () => {
      debouncedScanDocument.cancel();
    };
  }, [editorContent, isLoading, debouncedScanDocument]);

  useEffect(() => {
    const loadStoredSuggestions = () => {
      const storedSuggestions = localStorage.getItem(
        "contractAuditSuggestions"
      );
      if (storedSuggestions) {
        try {
          const parsedSuggestions = JSON.parse(storedSuggestions);
          console.log("📤 Loading stored suggestions:", parsedSuggestions);
          // Optionally, you could set these to state if needed
          // setInitialSuggestions(parsedSuggestions);
        } catch (error) {
          console.error("Error loading stored suggestions:", error);
        }
      }
    };

    // Run once on mount
    loadStoredSuggestions();
  }, []); // Empty dependency array ensures it only runs once

  return (
    <div className="space-y-4 h-[calc(100vh-180px)] flex flex-col">
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
                    data-issue-id={issue.id}
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-colors ${getTypeStyles(
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

import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { debounce } from "lodash";

interface AuditIssue {
  type: "spelling" | "rewording" | "upsell" | "general";
  text: string;
  suggestion?: string;
  section?: string;
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

interface GroupedIssues {
  [section: string]: AuditIssue[];
}

const groupIssuesBySection = (issues: AuditIssue[]): GroupedIssues => {
  return issues.reduce((groups: GroupedIssues, issue) => {
    const section = issue.section || "general";
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(issue);
    return groups;
  }, {});
};

const calculateSummary = (issues: AuditIssue[]): AuditSummary => {
  return issues.reduce(
    (summary, issue) => {
      summary.total++;
      switch (issue.type) {
        case "rewording":
          summary.rewordings++;
          break;
        case "spelling":
          summary.spelling++;
          break;
        case "upsell":
          summary.upsell++;
          break;
      }
      return summary;
    },
    { total: 0, rewordings: 0, spelling: 0, upsell: 0 }
  );
};

export function ContractAudit({
  editorContent,
  onFixClick,
  onIssueClick,
}: ContractAuditProps) {
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScannedContent, setLastScannedContent] = useState<string>("");
  const scanInProgress = useRef(false);
  const hasStoredSuggestions = useRef(false);
  const [highlightedBlocks, setHighlightedBlocks] = useState<Set<number>>(
    new Set()
  );

  const handleIssueClick = (issue: AuditIssue) => {
    console.log("🎯 Issue clicked:", issue);

    setHighlightedBlocks((prev) => {
      const newSet = new Set(prev);
      newSet.add(issue.position.blockIndex);
      return newSet;
    });

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
    if (typeof position?.blockIndex !== "number" || position.blockIndex < 0) {
      console.log("⚠️ Skipping invalid block index:", position);
      return;
    }

    console.log("🎨 Highlighting block:", { position, type });

    // Get the editor container
    const blocks = document.querySelectorAll(".ce-block");
    if (!blocks?.length) {
      console.log("❌ No editor blocks found");
      return;
    }

    const targetBlock = blocks[position.blockIndex];
    if (!targetBlock) {
      console.log("❌ Target block not found at index:", position.blockIndex);
      return;
    }

    // Remove existing highlight classes
    targetBlock.classList.remove(
      "audit-highlight",
      "audit-highlight-general",
      "audit-highlight-rewording",
      "audit-highlight-spelling",
      "audit-highlight-upsell"
    );

    // Add new highlight classes
    targetBlock.classList.add("audit-highlight", `audit-highlight-${type}`);

    // Scroll block into view
    targetBlock.scrollIntoView({ behavior: "smooth", block: "center" });

    console.log("✅ Successfully highlighted block:", targetBlock);
  };

  const highlightAllIssues = (issues: AuditIssue[]) => {
    const blocks = document.querySelectorAll(".ce-block");
    if (!blocks?.length) {
      console.log("⏳ Editor not ready, skipping highlights");
      return;
    }

    console.log("🎨 Attempting to highlight all issues:", issues);
    issues.forEach((issue) => {
      if (!issue?.position) return;
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

  // Load stored suggestions on mount
  useEffect(() => {
    const storedSuggestions = localStorage.getItem("contractAuditSuggestions");
    if (storedSuggestions) {
      try {
        const parsedSuggestions = JSON.parse(storedSuggestions);
        console.log("📤 Loading stored suggestions:", parsedSuggestions);
        setAuditData({
          issues: parsedSuggestions,
          groupedIssues: groupIssuesBySection(parsedSuggestions),
          summary: calculateSummary(parsedSuggestions),
        });
        hasStoredSuggestions.current = true;
        highlightAllIssues(parsedSuggestions);
        return;
      } catch (error) {
        console.error("❌ Error loading stored suggestions:", error);
      }
    }
  }, []);

  // Handle content changes
  useEffect(() => {
    const handleContentChange = async (content: any) => {
      if (!content?.blocks) return;

      const contentString = JSON.stringify(content);

      // Check if we have stored suggestions first
      const storedSuggestions = localStorage.getItem(
        "contractAuditSuggestions"
      );
      if (storedSuggestions) {
        try {
          const parsedSuggestions = JSON.parse(storedSuggestions);
          console.log("📋 Using stored suggestions");
          setAuditData({
            issues: parsedSuggestions,
            groupedIssues: groupIssuesBySection(parsedSuggestions),
            summary: calculateSummary(parsedSuggestions),
          });
          // Wait for editor to be ready before highlighting
          setTimeout(() => {
            highlightAllIssues(parsedSuggestions);
          }, 500);
          return;
        } catch (error) {
          console.error("❌ Error loading stored suggestions:", error);
        }
      }

      // Only proceed with new audit if we don't have stored suggestions
      if (scanInProgress.current) {
        console.log("🔄 Scan already in progress, skipping");
        return;
      }

      // Check if content has changed
      if (contentString === lastScannedContent) {
        console.log("📝 Content unchanged, skipping scan");
        return;
      }

      try {
        scanInProgress.current = true;
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
          setTimeout(() => {
            highlightAllIssues(data.issues);
          }, 500);
        }

        setAuditData(data);
        setLastScannedContent(contentString);
      } catch (error) {
        console.error("❌ Audit failed:", error);
      } finally {
        setIsLoading(false);
        scanInProgress.current = false;
      }
    };

    if (editorContent) {
      handleContentChange(editorContent);
    }
  }, [editorContent]);

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

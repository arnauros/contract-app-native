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
  const [isLoading, setIsLoading] = useState(false);
  const [hasRunAudit, setHasRunAudit] = useState(false);
  const [suggestionsShown, setSuggestionsShown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const initialAuditDone = useRef(false);

  // Get contract ID
  const contractId = window.location.pathname.split("/").pop();

  // Run audit only when content changes or no cached audit exists
  useEffect(() => {
    const runAudit = async () => {
      if (!editorContent?.blocks) return;

      // Try to get cached audit results first
      const cachedAudit = localStorage.getItem(`contract-audit-${contractId}`);
      const cachedContent = localStorage.getItem(
        `contract-content-${contractId}`
      );

      // If we have cached results and content hasn't changed, use cached audit
      if (cachedAudit && cachedContent === JSON.stringify(editorContent)) {
        console.log("📄 Using cached audit results");
        setAuditData(JSON.parse(cachedAudit));
        setHasRunAudit(true);
        return;
      }

      // Otherwise run new audit
      console.log("📄 Content changed, running new audit");
      try {
        setIsLoading(true);
        const response = await fetch("/api/auditContract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: editorContent.blocks }),
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log("✅ Audit completed successfully");

        // Cache the new audit results and content hash
        localStorage.setItem(
          `contract-audit-${contractId}`,
          JSON.stringify(data)
        );
        localStorage.setItem(
          `contract-content-${contractId}`,
          JSON.stringify(editorContent)
        );

        setAuditData(data);
        setHasRunAudit(true);
      } catch (error) {
        console.error("❌ Audit failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    runAudit();
  }, [editorContent, contractId]);

  const runAudit = async () => {
    if (!editorContent?.blocks) return;

    try {
      // Clear existing suggestions first
      setShowSuggestions(false);
      setIsLoading(true);

      const response = await fetch("/api/auditContract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: editorContent.blocks }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("✅ Manual audit completed successfully");
      setAuditData(data);
      setShowSuggestions(true);
      setSuggestionsShown(true);
    } catch (error) {
      console.error("❌ Manual audit failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAudit = useCallback(() => {
    console.log("👁️ Showing audit suggestions");
    setShowSuggestions(true);
    setSuggestionsShown(true);
  }, []);

  const buttonText = useMemo(() => {
    if (isLoading) return "Analyzing...";
    if (!hasRunAudit || !suggestionsShown) return "Show Audit";
    return "Rerun Audit";
  }, [isLoading, hasRunAudit, suggestionsShown]);

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
                <span>{auditData?.summary?.total ?? 0} suggestions found</span>
              </div>
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                <span>
                  {auditData?.summary?.rewordings ?? 0} rewording recommended
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                <span>{auditData?.summary?.spelling ?? 0} Spelling errors</span>
              </div>
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                <span>{auditData?.summary?.upsell ?? 0} Upsell potentials</span>
              </div>
            </>
          )}
        </div>
        <button
          onClick={suggestionsShown ? runAudit : handleShowAudit}
          disabled={isLoading}
          className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm 
            ${
              isLoading
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-50"
            } 
            transition-colors`}
        >
          {buttonText}
        </button>
      </div>

      {showSuggestions && auditData?.issues && auditData.issues.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto flex-grow">
          <h3 className="text-lg font-semibold mb-4">Suggestions</h3>
          <div className="space-y-4">
            {auditData.issues.map((issue, index) => (
              <div
                key={index}
                data-issue-id={issue.position.id}
                className={`p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${getIssueTypeStyles(
                  issue.type
                )}`}
                onClick={() =>
                  onIssueClick(issue.position.blockIndex, issue.type)
                }
              >
                <div className="flex items-start gap-3">
                  {getIssueIcon(issue.type)}
                  <div>
                    <div className="font-medium text-gray-900 mb-1">
                      {issue.text}
                    </div>
                    {issue.suggestion && (
                      <div className="text-sm text-gray-600">
                        Suggestion: {issue.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for styling
const getIssueTypeStyles = (type: string) => {
  switch (type) {
    case "rewording":
      return "bg-purple-50 border border-purple-100";
    case "spelling":
      return "bg-red-50 border border-red-100";
    case "upsell":
      return "bg-green-50 border border-green-100";
    default:
      return "bg-gray-50 border border-gray-100";
  }
};

const getIssueIcon = (type: string) => {
  switch (type) {
    case "rewording":
      return <DocumentTextIcon className="w-5 h-5 text-purple-500" />;
    case "spelling":
      return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
    case "upsell":
      return <CurrencyDollarIcon className="w-5 h-5 text-green-500" />;
    default:
      return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
  }
};

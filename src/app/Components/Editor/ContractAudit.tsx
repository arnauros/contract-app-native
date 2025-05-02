import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { debounce } from "lodash";
import { saveContractAudit, getContractAudit } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/context/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  getFirestore,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { initializeFirebase } from "@/lib/firebase/config";

interface AuditIssue {
  type: "Enhancement" | "Protection" | "Clarity" | "Communication";
  text: string;
  suggestion?: string;
  section?: string;
  position: {
    blockIndex: number;
    start: number;
    end: number;
    id?: string;
  };
}

interface AuditSummary {
  total: number;
  enhancements: number;
  protections: number;
  clarities: number;
  communications: number;
}

interface AuditResponse {
  issues: AuditIssue[];
  summary: AuditSummary;
  content?: string;
}

interface UserDocument {
  auditsRemaining: number;
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
        case "Enhancement":
          summary.enhancements++;
          break;
        case "Protection":
          summary.protections++;
          break;
        case "Clarity":
          summary.clarities++;
          break;
        case "Communication":
          summary.communications++;
          break;
      }
      return summary;
    },
    {
      total: 0,
      enhancements: 0,
      protections: 0,
      clarities: 0,
      communications: 0,
    }
  );
};

export function ContractAudit({
  editorContent,
  onFixClick,
  onIssueClick,
}: ContractAuditProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasRunAudit, setHasRunAudit] = useState(false);
  const [suggestionsShown, setSuggestionsShown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const { user, loading } = useAuth();

  // Get contract ID from URL and validate it
  const contractId = useMemo(() => {
    const id = window.location.pathname.split("/").pop();
    if (!id) {
      console.error("No contract ID found in URL");
      return null;
    }
    return id;
  }, []);

  // Check if an audit exists for this contract
  useEffect(() => {
    const checkExistingAudit = async () => {
      if (!contractId || !user) {
        setIsInitializing(false);
        return;
      }

      try {
        const { audit } = await getContractAudit(contractId);
        // If we have any audit record, this contract has been audited before
        if (audit) {
          setHasRunAudit(true);
          // Only set the audit data if the content matches
          if (audit.content === JSON.stringify(editorContent)) {
            console.log("📄 Loading cached audit results");
            setAuditData(audit as unknown as AuditResponse);
            setShowSuggestions(true);
            setSuggestionsShown(true);
          } else {
            // Clear audit data if content doesn't match
            setAuditData(null);
            setShowSuggestions(false);
            setSuggestionsShown(false);
          }
        }
      } catch (error) {
        console.error("Error checking audit existence:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    setIsInitializing(true);
    checkExistingAudit();
  }, [contractId, user, editorContent]);

  const runAudit = async () => {
    if (!editorContent?.blocks || !user) {
      toast.error("Please log in to run audits");
      return;
    }

    try {
      setIsLoading(true);

      // Run the audit
      const response = await fetch("/api/auditContract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: editorContent.blocks }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Save to Firestore first to ensure persistence
      if (contractId) {
        await saveContractAudit(contractId, {
          ...data,
          content: JSON.stringify(editorContent),
        });
      }

      // Update local state after successful save
      setAuditData(data);
      setShowSuggestions(true);
      setSuggestionsShown(true);
      setHasRunAudit(true);
    } catch (error) {
      console.error("❌ Audit failed:", error);
      toast.error("Failed to run audit");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-white w-[400px] absolute right-0 top-0 bottom-0 pointer-events-auto">
      {/* Fixed Header Section */}
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-gray-900 text-xl font-semibold">
            Contract Audit
          </h2>
          {hasRunAudit && auditData?.issues && auditData.issues.length > 0 && (
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-1.5 bg-gray-100 rounded-md transition-colors hover:bg-gray-200"
            >
              {isPanelCollapsed ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronUpIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}
        </div>
        {auditData && (
          <p className="text-sm text-gray-500 mb-4">
            {auditData.summary.total} suggestions found
          </p>
        )}
        <div className="space-y-3">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !hasRunAudit ? (
            <div className="text-center py-6">
              <div className="mb-4">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-gray-700 font-medium mb-2">
                No suggestions yet
              </h3>
              <p className="text-gray-500 text-sm">
                Run an analysis to get professional enhancement suggestions
              </p>
            </div>
          ) : auditData ? (
            <>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-purple-100">
                  <LightBulbIcon className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-700">
                  {auditData.summary.enhancements} enhancements
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-blue-100">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700">
                  {auditData.summary.protections} protections
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-100">
                  <DocumentTextIcon className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">
                  {auditData.summary.clarities} clarity improvements
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-yellow-100">
                  <BriefcaseIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-gray-700">
                  {auditData.summary.communications} communication tips
                </span>
              </div>
            </>
          ) : null}
        </div>
        <button
          onClick={runAudit}
          disabled={isLoading || isInitializing}
          className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm 
            ${
              isLoading || isInitializing
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-50"
            } 
            transition-colors`}
        >
          {isLoading
            ? "Analyzing..."
            : isInitializing
            ? "Loading..."
            : hasRunAudit
            ? "Run New Audit"
            : "Run Audit"}
        </button>
      </div>

      {/* Scrollable Suggestions Section */}
      {showSuggestions &&
        auditData?.issues &&
        auditData.issues.length > 0 &&
        !isPanelCollapsed && (
          <div className="flex-1 overflow-hidden bg-white border-t border-gray-200">
            <style jsx>{`
              .suggestions-container {
                position: relative;
                height: 100%;
                width: 400px;
                overflow: hidden;
              }
              .suggestions-scroll {
                position: absolute;
                top: 0;
                left: 0;
                right: -17px; /* Hide scrollbar */
                bottom: 0;
                overflow-y: scroll;
                padding-right: 17px; /* Compensate for hidden scrollbar */
              }
              .suggestions-scroll::-webkit-scrollbar {
                width: 8px;
              }
              .suggestions-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .suggestions-scroll::-webkit-scrollbar-thumb {
                background-color: transparent;
                border-radius: 4px;
              }
              .suggestions-scroll:hover::-webkit-scrollbar-thumb {
                background-color: #e5e7eb;
              }
            `}</style>
            <div className="suggestions-container">
              <div className="suggestions-scroll p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  Suggestions
                </h3>
                <div className="space-y-4">
                  {auditData.issues.map((issue, index) => (
                    <div
                      key={index}
                      data-issue-id={issue.position?.id}
                      className={`p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm ${getIssueTypeStyles(
                        issue.type
                      )}`}
                      onClick={() => {
                        if (issue.position?.blockIndex !== undefined) {
                          onIssueClick(issue.position.blockIndex, issue.type);

                          // Add a small delay to ensure the DOM is ready
                          setTimeout(() => {
                            const blockElement = document.querySelector(
                              `[data-block-index="${issue.position?.blockIndex}"]`
                            );
                            if (blockElement) {
                              blockElement.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });

                              // Add a temporary highlight class
                              blockElement.classList.add("highlight-pulse");
                              setTimeout(() => {
                                blockElement.classList.remove(
                                  "highlight-pulse"
                                );
                              }, 2000);
                            }
                          }, 100);
                        }
                      }}
                    >
                      <div className="flex flex-col items-start gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-full ${getIssueBackgroundStyle(
                              issue.type
                            )}`}
                          >
                            {getIssueIcon(issue.type)}
                          </div>
                          <span className="text-sm font-medium capitalize">
                            {issue.type}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 mb-1">
                            {issue.text}
                          </div>
                          {issue.suggestion && (
                            <div className="text-sm text-gray-600">
                              Suggestion: {issue.suggestion}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            Section: {issue.section || "Unnamed"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// Helper functions for styling
const getIssueTypeStyles = (type: string) => {
  switch (type.toLowerCase()) {
    case "enhancement":
      return "bg-purple-50 border border-purple-100";
    case "protection":
      return "bg-blue-50 border border-blue-100";
    case "clarity":
      return "bg-green-50 border border-green-100";
    case "communication":
      return "bg-yellow-50 border border-yellow-100";
    default:
      return "bg-gray-50 border border-gray-100";
  }
};

const getIssueBackgroundStyle = (type: string) => {
  switch (type.toLowerCase()) {
    case "enhancement":
      return "bg-purple-100";
    case "protection":
      return "bg-blue-100";
    case "clarity":
      return "bg-green-100";
    case "communication":
      return "bg-yellow-100";
    default:
      return "bg-gray-100";
  }
};

const getIssueIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "enhancement":
      return <LightBulbIcon className="w-5 h-5 text-purple-600" />;
    case "protection":
      return <ShieldCheckIcon className="w-5 h-5 text-blue-600" />;
    case "clarity":
      return <DocumentTextIcon className="w-5 h-5 text-green-600" />;
    case "communication":
      return <BriefcaseIcon className="w-5 h-5 text-yellow-600" />;
    default:
      return <InformationCircleIcon className="w-5 h-5 text-gray-600" />;
  }
};

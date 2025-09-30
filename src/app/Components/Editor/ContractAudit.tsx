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
  FunnelIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { debounce } from "lodash";
import { saveContractAudit, getContractAudit } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  doc,
  getDoc,
  setDoc,
  getFirestore,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { initFirebase } from "@/lib/firebase/firebase";

interface AuditIssue {
  type: "Enhancement" | "Protection" | "Clarity" | "Communication";
  text: string;
  suggestion?: string;
  section?: string;
  priority?: "high" | "medium" | "low";
  autoFix?: string;
  impact?: "legal" | "business" | "user-experience";
  targetText?: string;
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
  onFixClick: (issue: AuditIssue, index: number) => Promise<void>;
  onIssueClick: (
    blockIndex: number,
    type: string,
    targetText?: string,
    isAutoHighlight?: boolean
  ) => void;
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
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showPreview, setShowPreview] = useState<number | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(
    new Set()
  );
  const [suggestionHistory, setSuggestionHistory] = useState<
    Array<{ action: "apply" | "undo"; index: number; timestamp: number }>
  >([]);
  const [showComparison, setShowComparison] = useState(false);
  const [auditMetrics, setAuditMetrics] = useState<{
    totalSuggestions: number;
    appliedSuggestions: number;
    mostAppliedType: string;
    averageTimeToApply: number;
    effectivenessScore: number;
  } | null>(null);
  const { user, loading } = useAuth();

  // Clear all highlights
  const clearAllHighlights = () => {
    const editorElement = document.querySelector(".codex-editor");
    if (!editorElement) return;

    // Clear block highlights
    const highlightedBlocks =
      editorElement.querySelectorAll(".audit-highlight");
    highlightedBlocks.forEach((block) => {
      block.classList.remove("audit-highlight");
      block.classList.remove("audit-highlight-enhancement");
      block.classList.remove("audit-highlight-protection");
      block.classList.remove("audit-highlight-clarity");
      block.classList.remove("audit-highlight-communication");
    });

    // Clear word highlights
    const highlightedWords = editorElement.querySelectorAll(
      ".audit-word-highlight"
    );
    highlightedWords.forEach((word) => {
      const parent = word.parentNode;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(word.textContent || ""),
          word
        );
        parent.normalize();
      }
    });
  };

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
      if (!contractId || !user || hasRunAudit) {
        setIsInitializing(false);
        return;
      }

      try {
        const { audit } = await getContractAudit(contractId);
        // If we have any audit record, this contract has been audited before
        if (audit) {
          setHasRunAudit(true);
          console.log("📄 Loading cached audit results");
          console.log(
            "🔍 Audit data structure:",
            JSON.stringify(audit, null, 2)
          );

          // Check if cached audit has correct block indices
          const hasValidBlockIndices = audit.issues?.every((issue: any) => {
            const blockIndex = issue.position?.blockIndex;
            return (
              blockIndex !== undefined && blockIndex >= 0 && blockIndex < 24
            ); // Assuming max 24 blocks
          });

          // Also check if any block index is 24 (out of range)
          const hasOutOfRangeIndices = audit.issues?.some((issue: any) => {
            const blockIndex = issue.position?.blockIndex;
            return blockIndex === 24;
          });

          if (!hasValidBlockIndices || hasOutOfRangeIndices) {
            console.log(
              "⚠️ Cached audit has invalid block indices, clearing cache..."
            );
            console.log(
              "🔍 Invalid indices found:",
              audit.issues?.map((issue: any) => issue.position?.blockIndex)
            );
            // Clear the cached audit data
            await saveContractAudit(contractId, null);
            return;
          }

          setAuditData(audit as unknown as AuditResponse);
          setShowSuggestions(true);
          setSuggestionsShown(true);

          // Auto-highlight all cached suggestions at once
          setTimeout(() => {
            if (audit.issues && audit.issues.length > 0) {
              // Clear all highlights first
              onIssueClick(-1, "clear", undefined);
              // Then apply all highlights
              audit.issues.forEach((issue: any) => {
                if (issue.position?.blockIndex !== undefined) {
                  onIssueClick(
                    issue.position.blockIndex,
                    issue.type,
                    issue.targetText,
                    true // isAutoHighlight = true
                  );
                }
              });
            }
          }, 500);
        }
      } catch (error) {
        console.error("Error checking audit existence:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    setIsInitializing(true);
    checkExistingAudit();
  }, [contractId, user]); // Removed editorContent dependency to prevent re-runs

  // Filter suggestions based on current filters
  const filteredIssues = useMemo(() => {
    if (!auditData?.issues) return [];

    return auditData.issues.filter((issue) => {
      const typeMatch =
        filterType === "all" || issue.type.toLowerCase() === filterType;
      const priorityMatch =
        filterPriority === "all" || issue.priority === filterPriority;
      return typeMatch && priorityMatch;
    });
  }, [auditData?.issues, filterType, filterPriority]);

  // Calculate audit metrics
  const calculateMetrics = useMemo(() => {
    if (!auditData?.issues) return null;

    const totalSuggestions = auditData.issues.length;
    const appliedCount = appliedSuggestions.size;

    // Calculate most applied type
    const typeCounts = auditData.issues
      .filter((_, index) => appliedSuggestions.has(index))
      .reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostAppliedType =
      Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "None";

    // Calculate average time to apply (mock calculation)
    const applyTimes = suggestionHistory
      .filter((action) => action.action === "apply")
      .map((action) => action.timestamp);

    const averageTimeToApply =
      applyTimes.length > 0
        ? applyTimes.reduce((sum, time) => sum + time, 0) / applyTimes.length
        : 0;

    // Calculate effectiveness score (percentage of suggestions applied)
    const effectivenessScore =
      totalSuggestions > 0
        ? Math.round((appliedCount / totalSuggestions) * 100)
        : 0;

    return {
      totalSuggestions,
      appliedSuggestions: appliedCount,
      mostAppliedType,
      averageTimeToApply,
      effectivenessScore,
    };
  }, [auditData?.issues, appliedSuggestions, suggestionHistory]);

  // Handle applying a suggestion with AI improvement
  const handleApplySuggestion = async (index: number) => {
    const issue = auditData?.issues[index];

    if (!issue) {
      toast.error("Suggestion not found");
      return;
    }

    // Check if we have targetText for AI improvement
    if (issue.targetText && onFixClick) {
      try {
        // Call the AI text improvement function from ContractEditor
        await onFixClick(issue, index);

        // Mark as applied after successful AI improvement
        setAppliedSuggestions((prev) => new Set([...prev, index]));
        setSuggestionHistory((prev) => [
          ...prev,
          { action: "apply", index, timestamp: Date.now() },
        ]);
      } catch (error) {
        console.error("Error applying AI suggestion:", error);
        toast.error("Failed to apply AI suggestion");
      }
    } else {
      // Fallback to simple application without AI
      setAppliedSuggestions((prev) => new Set([...prev, index]));
      setSuggestionHistory((prev) => [
        ...prev,
        { action: "apply", index, timestamp: Date.now() },
      ]);
      toast.success("Suggestion applied!");
    }
  };

  // Handle undoing a suggestion
  const handleUndoSuggestion = (index: number) => {
    setAppliedSuggestions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setSuggestionHistory((prev) => [
      ...prev,
      { action: "undo", index, timestamp: Date.now() },
    ]);
    toast.success("Suggestion undone!");
  };

  // Handle bulk actions
  const handleBulkApply = (type?: string, priority?: string) => {
    const suggestionsToApply = filteredIssues
      .map((issue, index) => {
        const originalIndex = auditData.issues.findIndex((i) => i === issue);
        return { issue, originalIndex };
      })
      .filter(({ issue, originalIndex }) => {
        if (appliedSuggestions.has(originalIndex)) return false;
        if (type && issue.type.toLowerCase() !== type) return false;
        if (priority && issue.priority !== priority) return false;
        return true;
      });

    suggestionsToApply.forEach(({ originalIndex }) => {
      setAppliedSuggestions((prev) => new Set([...prev, originalIndex]));
      setSuggestionHistory((prev) => [
        ...prev,
        { action: "apply", index: originalIndex, timestamp: Date.now() },
      ]);
    });

    toast.success(`Applied ${suggestionsToApply.length} suggestions!`);
  };

  // Handle undo last action
  const handleUndoLast = () => {
    if (suggestionHistory.length === 0) {
      toast.error("No actions to undo");
      return;
    }

    const lastAction = suggestionHistory[suggestionHistory.length - 1];
    if (lastAction.action === "apply") {
      setAppliedSuggestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(lastAction.index);
        return newSet;
      });
    } else {
      setAppliedSuggestions((prev) => new Set([...prev, lastAction.index]));
    }

    setSuggestionHistory((prev) => prev.slice(0, -1));
    toast.success("Action undone!");
  };

  const runAudit = async () => {
    if (!editorContent?.blocks || !user) {
      toast.error("Please log in to run audits");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🚀 Running fresh audit with debugging...");

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
      console.log("📊 Fresh audit data received:", data);

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
      setAppliedSuggestions(new Set()); // Reset applied suggestions
      setSuggestionHistory([]); // Reset history

      // Auto-highlight all new suggestions at once
      setTimeout(() => {
        if (data.issues && data.issues.length > 0) {
          console.log("🎨 Auto-highlighting fresh audit suggestions...");
          // Clear all highlights first
          onIssueClick(-1, "clear", undefined);
          // Then apply all highlights
          data.issues.forEach((issue) => {
            if (issue.position?.blockIndex !== undefined) {
              onIssueClick(
                issue.position.blockIndex,
                issue.type,
                issue.targetText,
                true // isAutoHighlight = true
              );
            }
          });
        }
      }, 500);
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
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              {filteredIssues.length} of {auditData.summary.total} suggestions
            </p>
            {appliedSuggestions.size > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-green-600">
                  {appliedSuggestions.size} applied
                </p>
                {calculateMetrics && (
                  <div className="text-xs text-gray-500">
                    <div>
                      Effectiveness: {calculateMetrics.effectivenessScore}%
                    </div>
                    <div>Most applied: {calculateMetrics.mostAppliedType}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="space-y-3">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !isInitializing && !hasRunAudit && !auditData ? (
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

      {/* Filter Controls */}
      {showSuggestions &&
        auditData?.issues &&
        auditData.issues.length > 0 &&
        !isPanelCollapsed && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>
            <div className="flex gap-2 mb-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
              >
                <option value="all">All Types</option>
                <option value="enhancement">Enhancement</option>
                <option value="protection">Protection</option>
                <option value="clarity">Clarity</option>
                <option value="communication">Communication</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleBulkApply()}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                disabled={filteredIssues.length === 0}
              >
                Apply All
              </button>
              <button
                onClick={() => handleBulkApply(undefined, "high")}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                disabled={
                  filteredIssues.filter((i) => i.priority === "high").length ===
                  0
                }
              >
                Apply High Priority
              </button>
              {suggestionHistory.length > 0 && (
                <button
                  onClick={handleUndoLast}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Undo Last
                </button>
              )}
              <button
                onClick={clearAllHighlights}
                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                title="Clear all highlights"
              >
                Clear Highlights
              </button>
            </div>
          </div>
        )}

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
                right: 0;
                bottom: 0;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: transparent transparent;
              }
              .suggestions-scroll::-webkit-scrollbar {
                width: 6px;
              }
              .suggestions-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .suggestions-scroll::-webkit-scrollbar-thumb {
                background-color: transparent;
                border-radius: 3px;
                transition: background-color 0.2s ease;
              }
              .suggestions-scroll:hover::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2);
              }
            `}</style>
            <div className="suggestions-container">
              <div className="suggestions-scroll p-6">
                {calculateMetrics && (
                  <div className="flex items-center justify-end mb-4">
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            calculateMetrics.effectivenessScore >= 70
                              ? "bg-green-500"
                              : calculateMetrics.effectivenessScore >= 40
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        ></div>
                        {calculateMetrics.effectivenessScore}% effective
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {filteredIssues.map((issue, index) => {
                    const originalIndex = auditData.issues.findIndex(
                      (i) => i === issue
                    );
                    const isApplied = appliedSuggestions.has(originalIndex);
                    return (
                      <div
                        key={index}
                        data-issue-id={issue.position?.id}
                        className={`p-4 rounded-lg transition-all shadow-sm ${getIssueTypeStyles(
                          issue.type
                        )} ${
                          isApplied
                            ? "ring-2 ring-green-200 bg-green-50"
                            : "hover:opacity-90 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (issue.position?.blockIndex !== undefined) {
                            onIssueClick(
                              issue.position.blockIndex,
                              issue.type,
                              issue.targetText
                            );
                          }
                        }}
                        onMouseEnter={() => setShowPreview(originalIndex)}
                        onMouseLeave={() => setShowPreview(null)}
                      >
                        <div className="flex flex-col items-start gap-3">
                          <div className="flex items-center justify-between w-full">
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
                              {issue.priority && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(
                                    issue.priority
                                  )}`}
                                >
                                  {issue.priority}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isApplied ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUndoSuggestion(originalIndex);
                                  }}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                  title="Undo suggestion"
                                >
                                  <ArrowPathIcon className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplySuggestion(originalIndex);
                                  }}
                                  className="p-1 text-gray-600 hover:bg-gray-100 rounded group"
                                  title="AI Improve Text"
                                >
                                  <SparklesIcon className="w-4 h-4 group-hover:text-purple-600 transition-colors" />
                                </button>
                              )}
                              {issue.autoFix && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPreview(
                                      showPreview === originalIndex
                                        ? null
                                        : originalIndex
                                    );
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  title="Preview suggestion"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
                            {showPreview === originalIndex && issue.autoFix && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                <div className="font-medium text-blue-900 mb-1">
                                  Suggested fix:
                                </div>
                                <div className="text-blue-800">
                                  {issue.autoFix}
                                </div>
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              Section: {issue.section || "Unnamed"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

const getPriorityStyle = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

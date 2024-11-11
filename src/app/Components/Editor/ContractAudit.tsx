import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  LightBulbIcon,
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
}

export function ContractAudit({
  editorContent,
  onFixClick,
}: ContractAuditProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);

  useEffect(() => {
    const scanDocument = async () => {
      if (!editorContent?.blocks?.length) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/auditContract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: editorContent.blocks }),
        });

        const data = await response.json();
        setAuditData(data);
      } catch (error) {
        console.error("Audit failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    scanDocument();
  }, [editorContent]);

  // Loading state for both panels
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Audit Summary Panel */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-gray-700 text-lg font-medium mb-4">
            Contract Audit
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="h-9 bg-gray-200 rounded-lg w-full animate-pulse" />
          </div>
        </div>

        {/* Suggestions Panel */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 rounded w-full animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Audit Summary Panel */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-gray-700 text-lg font-medium mb-4">
          Contract Audit
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
            <span className="text-gray-900 text-sm">
              {auditData?.summary.total || 0} suggestions found
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
            <span className="text-gray-900 text-sm">
              {auditData?.summary.rewordings || 0} rewording recommended
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
            <span className="text-gray-900 text-sm">
              {auditData?.summary.spelling || 0} Spelling errors
            </span>
          </div>

          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-500" />
            <span className="text-gray-900 text-sm">
              {auditData?.summary.upsell || 0} Upsell potentials
            </span>
          </div>
        </div>

        <button
          onClick={onFixClick}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Fix for me
        </button>
      </div>

      {/* Suggestions Panel */}
      {auditData?.issues && auditData.issues.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-gray-700 text-lg font-medium mb-4 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            Suggestions
          </h2>
          <div className="space-y-4">
            {auditData.issues.map((issue, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
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

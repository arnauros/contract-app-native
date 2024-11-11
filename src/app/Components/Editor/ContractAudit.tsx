import {
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface AuditSummary {
  total: number;
  rewordings: number;
  spelling: number;
  upsell: number;
}

interface ContractAuditProps {
  isLoading?: boolean;
  summary?: AuditSummary;
  onFixClick: () => void;
}

export function ContractAudit({
  isLoading = false,
  summary,
  onFixClick,
}: ContractAuditProps) {
  // Empty state - when scan is complete but no issues found
  if (summary && summary.total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-gray-700 text-lg font-medium mb-4">
          Contract Audit
        </h2>
        <div className="flex flex-col items-center justify-center py-4">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-gray-600 text-sm text-center">
            No issues found! Your contract looks great.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
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
    );
  }

  // Normal state with issues
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-gray-700 text-lg font-medium mb-4">Contract Audit</h2>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
          <span className="text-gray-900 text-sm">
            {summary?.total || 0} issues found
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
          <span className="text-gray-900 text-sm">
            {summary?.rewordings || 0} rewording recommended
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
          <span className="text-gray-900 text-sm">
            {summary?.spelling || 0} Spelling errors
          </span>
        </div>

        <div className="flex items-center gap-3">
          <CurrencyDollarIcon className="w-5 h-5 text-gray-500" />
          <span className="text-gray-900 text-sm">
            {summary?.upsell || 0} Upsell potentials
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
  );
}

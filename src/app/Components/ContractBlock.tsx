import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

interface ContractBlockProps {
  block: any;
  issues?: AuditIssue[];
  onClick: (issues: AuditIssue[]) => void;
}

export function ContractBlock({ block, issues, onClick }: ContractBlockProps) {
  const hasIssues = issues && issues.length > 0;

  return (
    <div className="relative group">
      <div className="prose max-w-none">{block.data?.text}</div>

      {hasIssues && (
        <div
          className="absolute -left-8 top-1/2 -translate-y-1/2"
          onClick={() => onClick(issues!)}
        >
          <div className="relative cursor-pointer">
            <ExclamationCircleIcon className="h-6 w-6 text-amber-500" />
            {issues!.length > 1 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {issues!.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

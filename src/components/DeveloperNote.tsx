import React from "react";

interface DeveloperNoteProps {
  type?: "info" | "warning";
  title?: string;
  children: React.ReactNode;
  showInProduction?: boolean;
}

export function DeveloperNote({
  type = "info",
  title,
  children,
  showInProduction = false,
}: DeveloperNoteProps) {
  // Don't render in production unless explicitly requested
  if (process.env.NODE_ENV === "production" && !showInProduction) {
    return null;
  }

  const bgColorClass =
    type === "info"
      ? "bg-gray-100 text-gray-700"
      : "bg-yellow-50 text-yellow-700";

  return (
    <div className={`mb-4 px-3 py-2 text-xs ${bgColorClass} rounded-md`}>
      {title && <p className="font-medium">{title}</p>}
      <div className="text-xs">{children}</div>
    </div>
  );
}

export function StrictModeNote() {
  return (
    <DeveloperNote title="Dev Note: Double logging in development">
      <p>
        This is caused by React's StrictMode which mounts components twice to
        catch bugs.
      </p>
      <p className="mt-1">
        Use the <code className="bg-gray-200 px-1 rounded">logDebug</code>{" "}
        function from{" "}
        <code className="bg-gray-200 px-1 rounded">@/lib/utils</code> to prevent
        duplicate logs.
      </p>
    </DeveloperNote>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">
              Something went wrong!
            </h1>

            {process.env.NODE_ENV === "development" && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Global Error details:
                </p>
                <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-auto max-h-40 p-2 bg-red-100 rounded">
                  {error.message}
                </pre>
              </div>
            )}

            <div className="flex justify-center mt-4">
              <button
                onClick={reset}
                className="px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiRefreshCw, FiHome } from "react-icons/fi";

export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const router = useRouter();

  // Get a more user-friendly error message
  const getErrorMessage = () => {
    if (
      error.message.includes("subscription") ||
      error.message.includes("stripe")
    ) {
      return "There was an issue with the subscription service. Please try again later.";
    }

    if (
      error.message.includes("Firebase") ||
      error.message.includes("firestore")
    ) {
      return "There was an issue connecting to the database. Please check your connection.";
    }

    if (error.message.includes("auth") || error.message.includes("token")) {
      return "There was an authentication issue. Please try logging in again.";
    }

    return "An unexpected error occurred while loading this page.";
  };

  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center bg-gray-50 p-4"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <FiAlertTriangle className="text-red-600 w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
          Something went wrong
        </h2>

        <p className="text-gray-600 text-center mb-4">{getErrorMessage()}</p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-100 p-3 rounded-md mb-4 overflow-auto max-h-40">
            <p className="text-xs font-mono text-gray-800">{error.message}</p>
            {error.stack && (
              <pre className="text-xs font-mono mt-2 text-gray-700 whitespace-pre-wrap">
                {error.stack.split("\n").slice(1, 4).join("\n")}
              </pre>
            )}
          </div>
        )}

        <div className="flex flex-col space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiRefreshCw className="mr-2" /> Try again
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiHome className="mr-2" /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

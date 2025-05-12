"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorComponent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-red-600 px-6 py-4">
          <h1 className="text-white text-lg font-semibold">
            Something went wrong
          </h1>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">
            An unexpected error has occurred. We've been notified and are
            working to fix the issue.
          </p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition text-center"
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

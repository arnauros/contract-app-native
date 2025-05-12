"use client";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h1 className="text-white text-xl font-semibold">
                Application Error
              </h1>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-6">
                A critical error has occurred. Please try refreshing the page.
              </p>
              <button
                onClick={() => reset()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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

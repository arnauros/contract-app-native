"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

export default function TestEmailNotificationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const testData = {
    to: "hello@arnau.design", // Resend test mode only allows sending to this email
    recipientName: "Test User",
    signerName: "John Designer",
    contractId: "test-contract-123",
    contractTitle: "Test Contract",
  };

  const notificationTypes = [
    {
      type: "designer_signed",
      description: "Designer Signed Contract",
      color: "bg-green-500",
    },
    {
      type: "client_signed",
      description: "Client Signed Contract",
      color: "bg-blue-500",
    },
    {
      type: "contract_complete",
      description: "Contract Fully Executed",
      color: "bg-purple-500",
    },
  ];

  const sendTestNotification = async (
    notificationType: string,
    description: string
  ) => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/sendNotification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...testData,
          notificationType,
        }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      const testResult = {
        type: notificationType,
        description,
        success: response.ok,
        duration,
        result,
        timestamp: new Date().toISOString(),
      };

      setTestResults((prev) => [testResult, ...prev]);

      if (response.ok) {
        toast.success(`${description} sent successfully!`);
      } else {
        toast.error(`Failed to send ${description}: ${result.error}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult = {
        type: notificationType,
        description,
        success: false,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };

      setTestResults((prev) => [testResult, ...prev]);
      toast.error(
        `Error sending ${description}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendAllNotifications = async () => {
    setIsLoading(true);

    for (const notification of notificationTypes) {
      await sendTestNotification(notification.type, notification.description);
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Notification Tester
          </h1>
          <p className="text-gray-600 mb-8">
            Test the email notification system for contract signature events
          </p>

          {/* Test Configuration */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Test Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">To:</span> {testData.to}
              </div>
              <div>
                <span className="font-medium">Contract ID:</span>{" "}
                {testData.contractId}
              </div>
              <div>
                <span className="font-medium">Contract Title:</span>{" "}
                {testData.contractTitle}
              </div>
              <div>
                <span className="font-medium">Signer Name:</span>{" "}
                {testData.signerName}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={sendAllNotifications}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Sending..." : "Send All Notifications"}
            </button>

            <button
              onClick={clearResults}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Results
            </button>
          </div>

          {/* Individual Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {notificationTypes.map((notification) => (
              <button
                key={notification.type}
                onClick={() =>
                  sendTestNotification(
                    notification.type,
                    notification.description
                  )
                }
                disabled={isLoading}
                className={`p-4 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${notification.color}`}
              >
                <div className="text-lg mb-1">{notification.description}</div>
                <div className="text-sm opacity-90">{notification.type}</div>
              </button>
            ))}
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Test Results ({testResults.length})
              </h2>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.success
                        ? "bg-green-50 border-green-500"
                        : "bg-red-50 border-red-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            result.success ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">
                          {result.description}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.duration}ms
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Type:</span> {result.type}
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Time:</span>{" "}
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>

                    {result.success ? (
                      <div className="text-sm text-green-700">
                        <span className="font-medium">Status:</span> Success
                        {result.result?.message && (
                          <div className="mt-1">{result.result.message}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-red-700">
                        <span className="font-medium">Error:</span>{" "}
                        {result.error ||
                          result.result?.error ||
                          "Unknown error"}
                      </div>
                    )}

                    {result.result && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                          View Full Response
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How to Test
            </h3>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>Click "Send All Notifications" to test all email types</li>
              <li>
                Or click individual buttons to test specific notification types
              </li>
              <li>
                Check your email inbox (and spam folder) for the test emails
              </li>
              <li>Review the test results below for any errors</li>
              <li>
                Test the actual signature flow in the app to verify real
                notifications
              </li>
            </ol>
          </div>

          {/* Environment Info */}
          <div className="mt-6 bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Environment Info
            </h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <div>
                <span className="font-medium">Resend API Key:</span>{" "}
                {process.env.NEXT_PUBLIC_RESEND_API_KEY
                  ? "✅ Configured"
                  : "❌ Missing"}
              </div>
              <div>
                <span className="font-medium">Email From:</span>{" "}
                {process.env.NEXT_PUBLIC_EMAIL_FROM || "Using default"}
              </div>
              <div>
                <span className="font-medium">App URL:</span>{" "}
                {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

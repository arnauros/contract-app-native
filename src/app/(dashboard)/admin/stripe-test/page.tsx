"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function StripeTestPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [loading, isAdmin, router]);

  const runStripeTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/test-connection");
      if (!response.ok) {
        throw new Error(`API returned error status: ${response.status}`);
      }

      const results = await response.json();
      setTestResults(results);
    } catch (err: any) {
      console.error("Error testing Stripe:", err);
      setError(err.message || "Failed to test Stripe connection");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading indicator while checking auth
  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Checking access...</h1>
      </div>
    );
  }

  // If user is not admin, don't show anything (redirect happening in useEffect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Stripe Test Dashboard</h1>
      <p className="mb-6 text-gray-600">
        This page helps diagnose Stripe configuration and connectivity issues.
      </p>

      <div className="mb-6">
        <button
          onClick={runStripeTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? "Testing..." : "Run Stripe Test"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded text-red-800">
          <h3 className="font-semibold">Error</h3>
          <p>{error}</p>
        </div>
      )}

      {testResults && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-4 border-b">
            <h2 className="text-lg font-semibold">Test Results</h2>
            <p className="text-sm text-gray-600">
              Environment: {testResults.environment}
            </p>
          </div>

          <div className="p-4">
            <h3 className="font-semibold mb-2">Environment Variables</h3>
            <table className="w-full mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                    Variable
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm">Secret Key</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeSecretKey.exists ? (
                      <span className="text-green-600">Set</span>
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeSecretKey.obfuscated}
                    {testResults.variables.stripeSecretKey.isTestKey && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                        Test Key
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Publishable Key</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripePublishableKey.exists ? (
                      <span className="text-green-600">Set</span>
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripePublishableKey.obfuscated}
                    {testResults.variables.stripePublishableKey.isTestKey && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                        Test Key
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Webhook Secret</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeWebhookSecret.exists ? (
                      <span className="text-green-600">Set</span>
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeWebhookSecret.obfuscated}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Monthly Price ID</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeMonthlyPriceId.exists ? (
                      <span className="text-green-600">Set</span>
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeMonthlyPriceId.value || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Yearly Price ID</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeYearlyPriceId.exists ? (
                      <span className="text-green-600">Set</span>
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.variables.stripeYearlyPriceId.value || "N/A"}
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-semibold mb-2">Connection Tests</h3>
            <table className="w-full mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                    Test
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm">Stripe Connection</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.tests.stripeConnection ? (
                      <span className="text-green-600">Success</span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Customer Creation</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.tests.stripeCustomerCreation ? (
                      <span className="text-green-600">Success</span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Price Retrieval</td>
                  <td className="px-4 py-2 text-sm">
                    {testResults.tests.stripePriceRetrieval ? (
                      <span className="text-green-600">Success</span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {testResults.errors.length > 0 && (
              <>
                <h3 className="font-semibold mb-2">Errors</h3>
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <ul className="list-disc pl-5 space-y-1">
                    {testResults.errors.map((error: string, idx: number) => (
                      <li key={idx} className="text-sm text-red-800">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

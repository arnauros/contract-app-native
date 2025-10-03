"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import Link from "next/link";
import toast from "react-hot-toast";

export default function StripeTestPage() {
  const { user, loading: authLoading, loggedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );

  // Add test result
  const addTestResult = (
    test: string,
    status: "success" | "error" | "warning",
    message: string,
    details?: any
  ) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        status,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Clear test results
  const clearTestResults = () => {
    setTestResults([]);
  };

  // Test Stripe configuration
  const testStripeConfig = async () => {
    addTestResult(
      "Stripe Config",
      "warning",
      "Testing Stripe configuration..."
    );

    try {
      const response = await fetch("/api/stripe/test-connection", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      addTestResult(
        "Stripe Config",
        "success",
        "Stripe configuration is valid",
        data
      );
    } catch (error) {
      addTestResult(
        "Stripe Config",
        "error",
        `Stripe configuration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Test price IDs
  const testPriceIds = async () => {
    addTestResult("Price IDs", "warning", "Testing Stripe price IDs...");

    try {
      const monthlyResponse = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "test-user",
          priceId: STRIPE_PRICE_IDS.MONTHLY,
          testMode: true,
        }),
      });

      if (monthlyResponse.ok) {
        addTestResult("Price IDs", "success", "Monthly price ID is valid");
      } else {
        const errorData = await monthlyResponse.json();
        addTestResult(
          "Price IDs",
          "error",
          `Monthly price ID failed: ${errorData.error}`
        );
      }
    } catch (error) {
      addTestResult(
        "Price IDs",
        "error",
        `Price ID test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Test checkout session creation
  const testCheckoutCreation = async (plan: "monthly" | "yearly") => {
    if (!user) {
      addTestResult(
        "Checkout Creation",
        "error",
        "User must be logged in to test checkout"
      );
      return;
    }

    addTestResult(
      "Checkout Creation",
      "warning",
      `Testing ${plan} checkout creation...`
    );

    try {
      const priceId =
        plan === "monthly" ? STRIPE_PRICE_IDS.MONTHLY : STRIPE_PRICE_IDS.YEARLY;

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          priceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        addTestResult(
          "Checkout Creation",
          "error",
          `Checkout creation failed: ${errorData.error}`,
          errorData
        );
        return;
      }

      const data = await response.json();
      addTestResult(
        "Checkout Creation",
        "success",
        `${plan} checkout session created successfully`,
        {
          sessionId: data.sessionId,
          hasUrl: !!data.url,
        }
      );
    } catch (error) {
      addTestResult(
        "Checkout Creation",
        "error",
        `Checkout creation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Test webhook endpoint
  const testWebhookEndpoint = async () => {
    addTestResult(
      "Webhook Endpoint",
      "warning",
      "Testing webhook endpoint accessibility..."
    );

    try {
      // Test if webhook endpoint is accessible
      const response = await fetch("/api/stripe/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });

      // We expect this to fail with signature verification, but it should be accessible
      if (response.status === 400) {
        addTestResult(
          "Webhook Endpoint",
          "success",
          "Webhook endpoint is accessible (signature verification working)"
        );
      } else {
        addTestResult(
          "Webhook Endpoint",
          "warning",
          `Webhook endpoint responded with status: ${response.status}`
        );
      }
    } catch (error) {
      addTestResult(
        "Webhook Endpoint",
        "error",
        `Webhook endpoint test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Test user subscription status
  const testUserSubscription = async () => {
    if (!user) {
      addTestResult(
        "User Subscription",
        "error",
        "User must be logged in to test subscription"
      );
      return;
    }

    addTestResult(
      "User Subscription",
      "warning",
      "Testing user subscription status..."
    );

    try {
      const response = await fetch("/api/stripe/verify-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        addTestResult(
          "User Subscription",
          "error",
          `Subscription verification failed: ${errorData.error}`
        );
        return;
      }

      const data = await response.json();
      addTestResult(
        "User Subscription",
        "success",
        "User subscription status retrieved",
        data
      );
      setSubscriptionStatus(data.status || "none");
    } catch (error) {
      addTestResult(
        "User Subscription",
        "error",
        `Subscription test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Run all tests
  const runAllTests = async () => {
    clearTestResults();
    addTestResult(
      "Test Suite",
      "warning",
      "Starting comprehensive Stripe test suite..."
    );

    await testStripeConfig();
    await testPriceIds();
    await testWebhookEndpoint();
    await testUserSubscription();

    addTestResult("Test Suite", "success", "All tests completed");
  };

  // Handle actual checkout
  const handleCheckout = async (plan: "monthly" | "yearly") => {
    if (!user) {
      toast.error("Please log in to test checkout");
      return;
    }

    setLoading(true);
    addTestResult(
      "Live Checkout",
      "warning",
      `Starting ${plan} checkout process...`
    );

    try {
      const priceId =
        plan === "monthly" ? STRIPE_PRICE_IDS.MONTHLY : STRIPE_PRICE_IDS.YEARLY;

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          priceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        addTestResult(
          "Live Checkout",
          "error",
          `Checkout failed: ${errorData.error}`,
          errorData
        );
        toast.error("Checkout failed. Check test results for details.");
        return;
      }

      const { sessionId, url } = await response.json();
      addTestResult(
        "Live Checkout",
        "success",
        "Checkout session created, redirecting to Stripe...",
        { sessionId }
      );

      // Store session ID for verification
      localStorage.setItem("test_checkout_session_id", sessionId);
      localStorage.setItem("test_checkout_plan", plan);

      toast.success("Redirecting to Stripe checkout...");

      // Redirect to Stripe
      window.location.href = url;
    } catch (error) {
      addTestResult(
        "Live Checkout",
        "error",
        `Checkout error: ${error instanceof Error ? error.message : String(error)}`
      );
      toast.error("Checkout failed. Check test results for details.");
    } finally {
      setLoading(false);
    }
  };

  // Check for return from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const success = urlParams.get("success");

    if (sessionId && success === "true") {
      addTestResult(
        "Return from Stripe",
        "success",
        "Successfully returned from Stripe checkout",
        { sessionId }
      );

      // Test session verification
      const verifySession = async () => {
        addTestResult(
          "Session Verification",
          "warning",
          "Verifying checkout session..."
        );

        try {
          const response = await fetch("/api/stripe/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            addTestResult(
              "Session Verification",
              "error",
              `Session verification failed: ${errorData.error}`
            );
            return;
          }

          const data = await response.json();
          addTestResult(
            "Session Verification",
            "success",
            "Session verified successfully",
            data
          );

          // Refresh subscription status
          if (user) {
            await testUserSubscription();
          }
        } catch (error) {
          addTestResult(
            "Session Verification",
            "error",
            `Session verification error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      };

      verifySession();
    }
  }, [user]);

  // Fetch subscription status on mount
  useEffect(() => {
    if (user && !authLoading) {
      testUserSubscription();
    }
  }, [user, authLoading]);

  const renderAuthStatus = () => {
    if (authLoading) {
      return (
        <p className="mb-4 text-gray-600">Checking authentication status...</p>
      );
    }

    if (user) {
      return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-700">
            ✅ Logged in as {user.email}
          </p>
          <p className="text-sm text-green-600">User ID: {user.uid}</p>
          {subscriptionStatus && (
            <p className="text-sm text-green-600">
              Subscription: {subscriptionStatus}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="font-medium text-yellow-700">⚠️ Not logged in</p>
        <p className="text-sm text-yellow-600">
          <Link href="/login" className="text-blue-600 underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="text-blue-600 underline">
            Sign up
          </Link>{" "}
          to test payments
        </p>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">
        Stripe Payment Flow Test Suite
      </h1>

      {renderAuthStatus()}

      {/* Test Controls */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Run All Tests
          </button>
          <button
            onClick={clearTestResults}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Results
          </button>
          <button
            onClick={testStripeConfig}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Stripe Config
          </button>
          <button
            onClick={testPriceIds}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Price IDs
          </button>
          <button
            onClick={testWebhookEndpoint}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Webhook
          </button>
          <button
            onClick={testUserSubscription}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Subscription
          </button>
        </div>
      </div>

      {/* Live Checkout Tests */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Live Checkout Tests</h2>
        <p className="text-sm text-gray-600 mb-4">
          These will create real Stripe checkout sessions. Use test cards in
          Stripe's test mode.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => testCheckoutCreation("monthly")}
            disabled={loading || !user}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test Monthly Checkout
          </button>
          <button
            onClick={() => testCheckoutCreation("yearly")}
            disabled={loading || !user}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test Yearly Checkout
          </button>
        </div>
      </div>

      {/* Actual Payment Tests */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Actual Payment Tests</h2>
        <p className="text-sm text-gray-600 mb-4">
          These will redirect you to Stripe for actual payment processing. Use
          test cards.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={loading || !user}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Test Monthly Payment"}
          </button>
          <button
            onClick={() => handleCheckout("yearly")}
            disabled={loading || !user}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Test Yearly Payment"}
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">
            No test results yet. Run some tests to see results here.
          </p>
        ) : (
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{result.test}</p>
                    <p className="text-sm">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer">
                          Details
                        </summary>
                        <pre className="text-xs mt-1 overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environment Info */}
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Environment:</strong> {process.env.NODE_ENV}
            </p>
            <p>
              <strong>App URL:</strong> {process.env.NEXT_PUBLIC_APP_URL}
            </p>
            <p>
              <strong>Stripe Mode:</strong>{" "}
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes(
                "pk_live_"
              )
                ? "LIVE"
                : "TEST"}
            </p>
          </div>
          <div>
            <p>
              <strong>Monthly Price ID:</strong> {STRIPE_PRICE_IDS.MONTHLY}
            </p>
            <p>
              <strong>Yearly Price ID:</strong> {STRIPE_PRICE_IDS.YEARLY}
            </p>
            <p>
              <strong>Current Time:</strong> {new Date().toISOString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

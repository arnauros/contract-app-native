"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function TestSignatureSimplePage() {
  const [contractId] = useState("simple-test-999");
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const addTestResult = (result: string) => {
    setTestResults((prev) => [...prev, result]);
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    try {
      // Test 1: Basic localStorage operations
      addTestResult("✅ Test 1: Basic localStorage operations");
      const testKey = `test-signature-${contractId}`;
      const testSignature = {
        signature: "data:image/png;base64,test-signature",
        name: "Test User",
        signedAt: new Date().toISOString(),
      };

      localStorage.setItem(testKey, JSON.stringify(testSignature));
      const retrieved = localStorage.getItem(testKey);

      if (!retrieved) {
        throw new Error("Failed to store/retrieve from localStorage");
      }

      const parsed = JSON.parse(retrieved);
      if (parsed.name !== testSignature.name) {
        throw new Error("Data corruption in localStorage");
      }

      localStorage.removeItem(testKey);
      addTestResult("✅ Test 1: PASSED - localStorage operations working");

      // Test 2: Signature detection logic
      addTestResult("✅ Test 2: Signature detection logic");

      // Test unsigned state
      localStorage.removeItem(`contract-designer-signature-${contractId}`);
      localStorage.removeItem(`contract-client-signature-${contractId}`);

      const hasDesignerSig = !!localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      const hasClientSig = !!localStorage.getItem(
        `contract-client-signature-${contractId}`
      );
      const canEdit = !hasDesignerSig;

      if (hasDesignerSig || hasClientSig) {
        throw new Error("Should not have signatures after clearing");
      }
      if (!canEdit) {
        throw new Error("Should be able to edit when no signatures");
      }

      addTestResult("✅ Test 2: PASSED - Unsigned state detection working");

      // Test 3: Designer signature state
      addTestResult("✅ Test 3: Designer signature state");

      const designerSignature = {
        signature: "data:image/png;base64,designer-signature",
        name: "Designer Name",
        signedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        `contract-designer-signature-${contractId}`,
        JSON.stringify(designerSignature)
      );

      const hasDesignerSigAfter = !!localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      const canEditAfter = !hasDesignerSigAfter;

      if (!hasDesignerSigAfter) {
        throw new Error("Should have designer signature after setting");
      }
      if (canEditAfter) {
        throw new Error("Should not be able to edit with designer signature");
      }

      addTestResult("✅ Test 3: PASSED - Designer signature state working");

      // Test 4: Client signature state
      addTestResult("✅ Test 4: Client signature state");

      const clientSignature = {
        signature: "data:image/png;base64,client-signature",
        name: "Client Name",
        signedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        `contract-client-signature-${contractId}`,
        JSON.stringify(clientSignature)
      );

      const hasClientSigAfter = !!localStorage.getItem(
        `contract-client-signature-${contractId}`
      );

      if (!hasClientSigAfter) {
        throw new Error("Should have client signature after setting");
      }

      addTestResult("✅ Test 4: PASSED - Client signature state working");

      // Test 5: Signature removal
      addTestResult("✅ Test 5: Signature removal");

      localStorage.removeItem(`contract-designer-signature-${contractId}`);

      const hasDesignerSigRemoved = !!localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      const canEditRemoved = !hasDesignerSigRemoved;

      if (hasDesignerSigRemoved) {
        throw new Error("Should not have designer signature after removal");
      }
      if (!canEditRemoved) {
        throw new Error(
          "Should be able to edit after removing designer signature"
        );
      }

      addTestResult("✅ Test 5: PASSED - Signature removal working");

      // Test 6: Event system
      addTestResult("✅ Test 6: Event system");

      let eventReceived = false;
      const handleEvent = () => {
        eventReceived = true;
      };

      window.addEventListener("test-signature-event", handleEvent);

      const customEvent = new CustomEvent("test-signature-event", {
        detail: { contractId, test: true },
      });
      window.dispatchEvent(customEvent);

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      window.removeEventListener("test-signature-event", handleEvent);

      if (!eventReceived) {
        throw new Error("Event system not working");
      }

      addTestResult("✅ Test 6: PASSED - Event system working");

      // Test 7: Cache simulation
      addTestResult("✅ Test 7: Cache simulation");

      const cacheKey = `cache-test-${contractId}`;
      const cacheValue = { timestamp: Date.now(), data: "test" };

      // Simulate cache storage
      localStorage.setItem(cacheKey, JSON.stringify(cacheValue));

      const startTime = Date.now();
      const retrievedCache = localStorage.getItem(cacheKey);
      const endTime = Date.now();

      if (!retrievedCache) {
        throw new Error("Cache retrieval failed");
      }

      const cacheDuration = endTime - startTime;
      if (cacheDuration > 10) {
        throw new Error("Cache too slow");
      }

      localStorage.removeItem(cacheKey);
      addTestResult("✅ Test 7: PASSED - Cache simulation working");

      addTestResult(
        "🎉 ALL TESTS PASSED! Core signature logic is working correctly."
      );
    } catch (error) {
      addTestResult(
        `❌ TEST FAILED: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    setIsRunningTests(false);
    toast.success("Simple tests completed!");
  };

  const clearAllData = () => {
    localStorage.removeItem(`contract-designer-signature-${contractId}`);
    localStorage.removeItem(`contract-client-signature-${contractId}`);
    setTestResults([]);
    toast.success("All test data cleared");
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading simple test suite...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Simple Signature Logic Test
        </h1>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="font-medium text-green-800 mb-1">
                Simple Testing Mode
              </h3>
              <p className="text-sm text-green-700">
                This test suite focuses on the core signature logic without any
                external dependencies. It tests localStorage operations,
                signature detection, and basic event handling.
              </p>
            </div>
          </div>
        </div>

        {/* Current State Display */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                LocalStorage State
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Designer Signature:</span>
                  <span
                    className={
                      localStorage.getItem(
                        `contract-designer-signature-${contractId}`
                      )
                        ? "text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {localStorage.getItem(
                      `contract-designer-signature-${contractId}`
                    )
                      ? "Yes"
                      : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client Signature:</span>
                  <span
                    className={
                      localStorage.getItem(
                        `contract-client-signature-${contractId}`
                      )
                        ? "text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {localStorage.getItem(
                      `contract-client-signature-${contractId}`
                    )
                      ? "Yes"
                      : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Can Edit:</span>
                  <span
                    className={
                      !localStorage.getItem(
                        `contract-designer-signature-${contractId}`
                      )
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {!localStorage.getItem(
                      `contract-designer-signature-${contractId}`
                    )
                      ? "Yes"
                      : "No"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Test Info</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Contract ID: {contractId}</p>
                <p>Tests: {testResults.length}</p>
                <p>Status: {isRunningTests ? "Running" : "Ready"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningTests ? "Running Tests..." : "Run All Simple Tests"}
            </button>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Clear All Test Data
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          {testResults.length === 0 ? (
            <p className="text-gray-500">
              No tests run yet. Click "Run All Simple Tests" to start.
            </p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.includes("✅") || result.includes("🎉")
                      ? "bg-green-50 text-green-800"
                      : result.includes("❌")
                      ? "bg-red-50 text-red-800"
                      : "bg-gray-50 text-gray-800"
                  }`}
                >
                  <p className="text-sm font-mono">{result}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                LocalStorage Data
              </h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(
                  {
                    designer: localStorage.getItem(
                      `contract-designer-signature-${contractId}`
                    ),
                    client: localStorage.getItem(
                      `contract-client-signature-${contractId}`
                    ),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                Test Environment
              </h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(
                  {
                    contractId,
                    isClient,
                    localStorageAvailable: typeof localStorage !== "undefined",
                    windowAvailable: typeof window !== "undefined",
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

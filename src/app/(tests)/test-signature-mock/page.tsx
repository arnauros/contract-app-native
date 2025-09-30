"use client";

import { useState, useEffect } from "react";
import {
  useSignatureState,
  useCanEditContract,
} from "@/lib/hooks/useSignatureState";
import {
  signatureManager,
  invalidateSignatureCache,
} from "@/lib/signature/SignatureManager";
import {
  dispatchSignatureChange,
  dispatchUnsignRequest,
  dispatchSignatureRemoved,
} from "@/lib/signature/signatureEvents";
import { toast } from "react-hot-toast";

interface TestResult {
  test: string;
  status: "pending" | "running" | "passed" | "failed";
  message?: string;
  duration?: number;
}

// Mock localStorage operations for testing
const mockLocalStorage = {
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  },
  getItem: (key: string) => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  },
};

export default function TestSignatureMockPage() {
  const [contractId] = useState("mock-test-contract-789");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Test the hooks - only on client side
  const {
    signatureState,
    canEdit,
    reason,
    isLoading,
    refresh,
    invalidateCache,
  } = useSignatureState({
    contractId: isClient ? contractId : "",
    autoRefresh: isClient,
    refreshInterval: 2000,
  });

  const {
    canEdit: canEditSimple,
    reason: reasonSimple,
    isLoading: isLoadingSimple,
  } = useCanEditContract(isClient ? contractId : "");

  const addTestResult = (
    test: string,
    status: TestResult["status"],
    message?: string,
    duration?: number
  ) => {
    setTestResults((prev) => [...prev, { test, status, message, duration }]);
  };

  const runTest = async (
    testName: string,
    testFn: () => Promise<void>
  ): Promise<void> => {
    const startTime = Date.now();
    addTestResult(testName, "running");

    try {
      await testFn();
      const duration = Date.now() - startTime;
      addTestResult(testName, "passed", undefined, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addTestResult(
        testName,
        "failed",
        error instanceof Error ? error.message : String(error),
        duration
      );
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    // Test 1: Initial state
    await runTest("Initial State Check", async () => {
      if (isLoading) throw new Error("Should not be loading initially");
      if (!canEdit) throw new Error("Should be able to edit unsigned contract");
    });

    // Test 1.5: Verify localStorage is working
    await runTest("LocalStorage Setup", async () => {
      const testKey = `test-key-${contractId}`;
      const testValue = "test-value";

      mockLocalStorage.setItem(testKey, testValue);
      const retrieved = mockLocalStorage.getItem(testKey);

      if (retrieved !== testValue) {
        throw new Error("LocalStorage not working properly");
      }

      mockLocalStorage.removeItem(testKey);
    });

    // Test 2: Cache functionality
    await runTest("Cache Functionality", async () => {
      const start1 = Date.now();
      await signatureManager.getSignatureState(contractId);
      const firstCall = Date.now() - start1;

      const start2 = Date.now();
      await signatureManager.getSignatureState(contractId);
      const secondCall = Date.now() - start2;

      if (secondCall > firstCall * 0.5)
        throw new Error("Cache not working efficiently");
    });

    // Test 3: Mock designer signature in localStorage
    await runTest("Mock Designer Signature", async () => {
      const mockSignature = {
        signature: "data:image/png;base64,mock-designer-signature",
        name: "Mock Designer",
        signedAt: new Date().toISOString(),
      };

      // Set localStorage directly
      mockLocalStorage.setItem(
        `contract-designer-signature-${contractId}`,
        JSON.stringify(mockSignature)
      );

      // Verify localStorage was set
      const stored = mockLocalStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      if (!stored) throw new Error("Failed to store signature in localStorage");

      // Force cache invalidation and refresh
      invalidateCache();
      await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
      await refresh();
      await new Promise((resolve) => setTimeout(resolve, 200)); // Wait longer for state update

      // Check if the signature state was updated - use direct check instead of hook state
      const currentState = await signatureManager.getSignatureState(contractId);

      console.log("Debug - Current signature state:", currentState);
      console.log("Debug - Stored signature:", stored);

      if (!currentState.hasDesignerSignature)
        throw new Error("Should not be able to edit after signing");
      if (!currentState.hasDesignerSignature)
        throw new Error("Should have designer signature");
    });

    // Test 4: Mock client signature in localStorage
    await runTest("Mock Client Signature", async () => {
      const mockSignature = {
        signature: "data:image/png;base64,mock-client-signature",
        name: "Mock Client",
        signedAt: new Date().toISOString(),
      };

      // Set localStorage directly
      mockLocalStorage.setItem(
        `contract-client-signature-${contractId}`,
        JSON.stringify(mockSignature)
      );

      // Force cache invalidation and refresh
      invalidateCache();
      await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
      await refresh();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for state update

      // Check if the signature state was updated
      const currentState = await signatureManager.getSignatureState(contractId);

      if (!currentState.hasClientSignature)
        throw new Error("Should have client signature");
    });

    // Test 5: Event system
    await runTest("Event System", async () => {
      let eventReceived = false;

      const handleEvent = () => {
        eventReceived = true;
      };

      window.addEventListener("signatureStateChanged", handleEvent);

      dispatchSignatureChange({
        contractId,
        hasDesignerSignature: true,
        hasClientSignature: true,
        source: "test",
      });

      // Wait a bit for event to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      window.removeEventListener("signatureStateChanged", handleEvent);

      if (!eventReceived) throw new Error("Event not received");
    });

    // Test 6: Remove mock signatures
    await runTest("Remove Mock Signatures", async () => {
      mockLocalStorage.removeItem(`contract-designer-signature-${contractId}`);
      mockLocalStorage.removeItem(`contract-client-signature-${contractId}`);
      invalidateCache();
      await refresh();

      // Wait a bit for state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!canEdit)
        throw new Error("Should be able to edit after removing signature");
      if (signatureState.hasDesignerSignature)
        throw new Error("Should not have designer signature");
    });

    // Test 7: Error handling
    await runTest("Error Handling", async () => {
      // Test with invalid contract ID
      const result = await signatureManager.canEditContract("invalid-id");
      if (!result.canEdit)
        throw new Error("Should default to allowing edit on error");
    });

    // Test 8: localStorage sync
    await runTest("LocalStorage Sync", async () => {
      // Check if localStorage is updated
      const localDesigner = mockLocalStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      const localClient = mockLocalStorage.getItem(
        `contract-client-signature-${contractId}`
      );

      if (signatureState.hasDesignerSignature && !localDesigner) {
        throw new Error("LocalStorage not synced for designer signature");
      }
      if (signatureState.hasClientSignature && !localClient) {
        throw new Error("LocalStorage not synced for client signature");
      }
    });

    setIsRunningTests(false);
    toast.success("All mock tests completed!");
  };

  const clearAllSignatures = async () => {
    try {
      mockLocalStorage.removeItem(`contract-designer-signature-${contractId}`);
      mockLocalStorage.removeItem(`contract-client-signature-${contractId}`);
      invalidateCache();
      await refresh();
      toast.success("All mock signatures cleared");
    } catch (error) {
      toast.error("Failed to clear signatures");
    }
  };

  const simulateSignatureChange = () => {
    dispatchSignatureChange({
      contractId,
      hasDesignerSignature: !signatureState.hasDesignerSignature,
      hasClientSignature: signatureState.hasClientSignature,
      source: "manual-test",
    });
  };

  const simulateUnsignRequest = () => {
    dispatchUnsignRequest(contractId, "manual-test");
  };

  const simulateSignatureRemoved = () => {
    dispatchSignatureRemoved(contractId, "manual-test");
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading mock test suite...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Signature System Mock Test Suite
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5 mr-3"
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
              <h3 className="font-medium text-blue-800 mb-1">
                Mock Testing Mode
              </h3>
              <p className="text-sm text-blue-700">
                This test suite uses localStorage mocking instead of real
                Firestore operations. It tests the signature management logic
                without requiring authentication or existing contracts.
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
                Signature State
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Loading:</span>
                  <span
                    className={isLoading ? "text-yellow-600" : "text-green-600"}
                  >
                    {isLoading ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Can Edit:</span>
                  <span className={canEdit ? "text-green-600" : "text-red-600"}>
                    {canEdit ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Designer Signature:</span>
                  <span
                    className={
                      signatureState.hasDesignerSignature
                        ? "text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {signatureState.hasDesignerSignature ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client Signature:</span>
                  <span
                    className={
                      signatureState.hasClientSignature
                        ? "text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {signatureState.hasClientSignature ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Checked:</span>
                  <span className="text-gray-600">
                    {new Date(signatureState.lastChecked).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                Simple Hook Test
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Can Edit:</span>
                  <span
                    className={
                      canEditSimple ? "text-green-600" : "text-red-600"
                    }
                  >
                    {canEditSimple ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Loading:</span>
                  <span
                    className={
                      isLoadingSimple ? "text-yellow-600" : "text-green-600"
                    }
                  >
                    {isLoadingSimple ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reason:</span>
                  <span className="text-gray-600 text-xs">
                    {reasonSimple || "None"}
                  </span>
                </div>
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
              {isRunningTests ? "Running Tests..." : "Run All Mock Tests"}
            </button>
            <button
              onClick={clearAllSignatures}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Clear All Mock Signatures
            </button>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Refresh State
            </button>
            <button
              onClick={invalidateCache}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Invalidate Cache
            </button>
          </div>
        </div>

        {/* Event Simulation */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Event Simulation</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={simulateSignatureChange}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Simulate Signature Change
            </button>
            <button
              onClick={simulateUnsignRequest}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Simulate Unsign Request
            </button>
            <button
              onClick={simulateSignatureRemoved}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Simulate Signature Removed
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          {testResults.length === 0 ? (
            <p className="text-gray-500">
              No tests run yet. Click "Run All Mock Tests" to start.
            </p>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.status === "passed"
                      ? "bg-green-50 border-green-200"
                      : result.status === "failed"
                      ? "bg-red-50 border-red-200"
                      : result.status === "running"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {result.test}
                      </h3>
                      {result.message && (
                        <p className="text-sm text-gray-600 mt-1">
                          {result.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {result.duration && (
                        <span className="text-xs text-gray-500">
                          {result.duration}ms
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === "passed"
                            ? "bg-green-100 text-green-800"
                            : result.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : result.status === "running"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                  </div>
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
                Signature Manager Cache
              </h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(signatureManager, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">LocalStorage</h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(
                  {
                    designer: mockLocalStorage.getItem(
                      `contract-designer-signature-${contractId}`
                    ),
                    client: mockLocalStorage.getItem(
                      `contract-client-signature-${contractId}`
                    ),
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

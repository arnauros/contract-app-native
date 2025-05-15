"use client";

import { useEffect, useState } from "react";
import { getContract } from "@/lib/firebase/firestore";
import { validateContractToken } from "@/lib/firebase/token";
import { useAuth } from "@/lib/hooks/useAuth";

export default function TestAccessPage() {
  const [contractId, setContractId] = useState("hjoMG5hyznxVzluwV3EU"); // Default test contract ID
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const testAccess = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      console.log(`🔍 Testing access to contract: ${contractId}`);

      // Test 1: Direct Firestore Access
      console.log("Test 1: Direct Firestore Access");
      const contractResult = await getContract(contractId);
      console.log("Contract result:", contractResult);

      // Test 2: Token Validation (without token)
      console.log("Test 2: Token Validation (without token)");
      let tokenResult = null;
      try {
        tokenResult = await validateContractToken(contractId, "invalid-token");
        console.log("Token validation result:", tokenResult);
      } catch (error) {
        console.error("Token validation error:", error);
        tokenResult = { error: error };
      }

      // Test 3: Authentication Status
      console.log("Test 3: Authentication Status");
      const authStatus = {
        isLoggedIn: !!user,
        userId: user?.uid || "not logged in",
        email: user?.email || "not logged in",
      };
      console.log("Auth status:", authStatus);

      // Compile all test results
      const results = {
        timestamp: new Date().toISOString(),
        contractId,
        contractTest: contractResult,
        tokenTest: tokenResult,
        authStatus,
      };

      setTestResult(results);
    } catch (error) {
      console.error("Test error:", error);
      setTestResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-run the test on component mount
    if (!authLoading) {
      testAccess();
    }
  }, [authLoading]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Public Access Test Page</h1>

      <div className="bg-green-100 p-4 rounded mb-6">
        <p>
          If you can see this, the public access routing is working correctly!
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            className="px-3 py-2 border rounded flex-1"
            placeholder="Contract ID to test"
          />
          <button
            onClick={testAccess}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Testing..." : "Test Access"}
          </button>
        </div>
      </div>

      {testResult && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Direct Access Links</h3>
            <ul className="bg-white p-4 rounded border list-disc ml-5 space-y-2">
              <li>
                <a
                  href={`/view/${contractId}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  View Page (no token)
                </a>
              </li>
              <li>
                <a
                  href={`/contract-view/${contractId}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Contract View Page
                </a>
              </li>
              <li>
                <a
                  href={`/public-view/${contractId}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Public View Page
                </a>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

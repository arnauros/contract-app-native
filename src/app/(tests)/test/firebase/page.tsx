"use client";

import React, { useState, useEffect } from "react";
import { testFirebaseConnection } from "../../test-firebase";
import { getAuth, signInAnonymously } from "firebase/auth";
import { initializeFirebase } from "@/lib/firebase/config";

export default function FirebaseTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const testResult = await testFirebaseConnection();
      setResult(testResult);
      setSignedIn(testResult.authStatus);
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
      console.error("Test error:", err);
    } finally {
      setLoading(false);
    }
  };

  const signInAnon = async () => {
    setLoading(true);
    try {
      // Initialize Firebase
      const { app } = initializeFirebase();
      const auth = getAuth();

      const userCredential = await signInAnonymously(auth);
      setSignedIn(true);
      console.log("Signed in anonymously:", userCredential.user.uid);
    } catch (err: any) {
      setError(err.message || "Failed to sign in anonymously");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if already signed in
    const auth = getAuth();
    if (auth.currentUser) {
      setSignedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Firebase Connection Test</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={signedIn ? runTest : signInAnon}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading
              ? "Processing..."
              : signedIn
              ? "Run Firebase Test"
              : "Sign In Anonymously First"}
          </button>

          <div className="text-sm">
            <span className="font-medium">Authentication Status:</span>{" "}
            <span className={signedIn ? "text-green-600" : "text-red-600"}>
              {signedIn ? "Signed In" : "Not Signed In"}
            </span>
          </div>
        </div>

        {result && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b">
              <h2 className="font-medium">Test Results</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Status:</p>
                  <p
                    className={
                      result.success ? "text-green-600" : "text-red-600"
                    }
                  >
                    {result.success ? "Success" : "Failed"}
                  </p>
                </div>

                <div>
                  <p className="font-medium">Message:</p>
                  <p>{result.message}</p>
                </div>

                <div>
                  <p className="font-medium">Auth Status:</p>
                  <p
                    className={
                      result.authStatus ? "text-green-600" : "text-red-600"
                    }
                  >
                    {result.authStatus ? "Authenticated" : "Not Authenticated"}
                  </p>
                </div>

                {result.user && (
                  <div>
                    <p className="font-medium">User:</p>
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto text-sm">
                      {JSON.stringify(result.user, null, 2)}
                    </pre>
                  </div>
                )}

                {result.firestoreTest && (
                  <div>
                    <p className="font-medium">Firestore Test:</p>
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto text-sm">
                      {JSON.stringify(result.firestoreTest, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

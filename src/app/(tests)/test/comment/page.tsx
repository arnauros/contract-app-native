"use client";

import React, { useState, useEffect } from "react";
import { testAddComment } from "../../test-comment-add";
import { getAuth, signInAnonymously, signOut } from "firebase/auth";
import { initializeFirebase } from "@/lib/firebase/config";

export default function CommentTestPage() {
  const [contractId, setContractId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Check auth status on load
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      console.log("Auth state changed:", user?.uid || "No user");
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      initializeFirebase();
      const auth = getAuth();
      const result = await signInAnonymously(auth);
      console.log("Signed in anonymously:", result.user.uid);
    } catch (err: any) {
      setError(`Sign in failed: ${err.message}`);
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      await signOut(auth);
      setResult(null);
    } catch (err: any) {
      setError(`Sign out failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestComment = async () => {
    if (!contractId) {
      setError("Please enter a contract ID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const result = await testAddComment(contractId);
      setResult(result);
      if (!result.success) {
        setError(result.error || "Unknown error occurred");
      }
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
      console.error("Test error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Comment Addition Test</h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Authentication Status</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              {user ? (
                <div className="p-3 bg-green-50 text-green-700 rounded-md">
                  <p>
                    <strong>Signed in:</strong> {user.uid}
                  </p>
                  <p className="text-sm">{user.email || "Anonymous user"}</p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md">
                  <p>Not signed in</p>
                </div>
              )}
            </div>
            <button
              onClick={user ? handleSignOut : handleSignIn}
              disabled={loading}
              className={`px-4 py-2 rounded-md ${
                user
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {loading
                ? "Processing..."
                : user
                ? "Sign Out"
                : "Sign In Anonymously"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Test Adding Comment</h2>
          <div className="mb-4">
            <label htmlFor="contractId" className="block mb-1 font-medium">
              Contract ID
            </label>
            <input
              type="text"
              id="contractId"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter contract ID"
            />
          </div>

          <button
            onClick={handleTestComment}
            disabled={loading || !user || !contractId}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loading ? "Processing..." : "Test Add Comment"}
          </button>
        </div>

        {result && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b">
              <h2 className="font-medium">Test Results</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
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

                {result.commentId && (
                  <div>
                    <p className="font-medium">Comment ID:</p>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {result.commentId}
                    </p>
                  </div>
                )}

                {result.error && (
                  <div>
                    <p className="font-medium">Error:</p>
                    <p className="text-red-600">{result.error}</p>
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

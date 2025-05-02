"use client";

import React, { useState, useEffect } from "react";
import { testAddComment, listComments } from "../test-comments";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import { initializeFirebase } from "@/lib/firebase/config";

export default function TestCommentPage() {
  const [contractId, setContractId] = useState("L1l2YxnwIqvlYpdj8dLp"); // Default to the contract ID shown in your screenshot
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);

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
      setComments([]);
    } catch (err: any) {
      setError(`Sign out failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
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
      } else {
        // Refresh comments list after adding
        await fetchComments();
      }
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
      console.error("Test error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!contractId) {
      setError("Please enter a contract ID");
      return;
    }

    setLoading(true);
    try {
      const result = await listComments(contractId);
      if (result.success && result.comments) {
        setComments(result.comments);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch comments");
        setComments([]);
      }
    } catch (err: any) {
      setError(`Failed to fetch comments: ${err.message}`);
      console.error("Fetch error:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Firestore Comment Test</h1>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
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

            <div className="flex gap-2">
              <button
                onClick={handleAddComment}
                disabled={loading || !user}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
              >
                {loading ? "Processing..." : "Add Test Comment"}
              </button>

              <button
                onClick={fetchComments}
                disabled={loading || !contractId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
              >
                {loading ? "Loading..." : "Fetch Comments"}
              </button>
            </div>
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

        {/* Comments List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Comments for Contract</h2>

          {comments.length === 0 ? (
            <div className="p-4 bg-gray-50 text-gray-500 rounded-lg text-center">
              No comments found
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="font-medium">
                  Found {comments.length} comments
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4">
                    <div className="flex justify-between">
                      <p className="font-medium">
                        {comment.userName || "Anonymous"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-1">{comment.comment}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Block ID: {comment.blockId}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

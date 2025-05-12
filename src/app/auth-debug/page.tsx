"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase/firebase";
import { Auth } from "firebase/auth";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function AuthDebugPage() {
  const { user, loading, error, loggedIn, isDevelopment } = useAuth();
  const [sessionCookie, setSessionCookie] = useState<string | null>(null);
  const [authState, setAuthState] = useState<any>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    // Check for session cookie
    const getCookies = () => {
      const cookies = document.cookie.split(";");
      const sessionCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("session=")
      );
      setSessionCookie(
        sessionCookie ? sessionCookie.trim().substring(8) : null
      );
    };

    getCookies();

    // Get current auth state
    const firebaseAuth = auth as Auth | null;

    if (firebaseAuth) {
      setAuthState({
        currentUser: firebaseAuth.currentUser
          ? {
              uid: firebaseAuth.currentUser.uid,
              email: firebaseAuth.currentUser.email,
              emailVerified: firebaseAuth.currentUser.emailVerified,
            }
          : null,
        isSignedIn: !!firebaseAuth.currentUser,
      });
    } else {
      setAuthState({
        error: "Firebase auth is not initialized",
        currentUser: null,
        isSignedIn: false,
      });
    }
  }, [refreshCount]);

  const handleRefresh = () => {
    setRefreshCount((prev) => prev + 1);
    toast.success("Refreshed auth state");
  };

  const handleClearSession = () => {
    // Clear all cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    toast.success("Cleared session cookies");
    // Refresh state
    setRefreshCount((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>

      <div className="flex flex-col space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Auth Hook State</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
              >
                Refresh
              </button>
              <button
                onClick={handleClearSession}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                Clear Session
              </button>
            </div>
          </div>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(
              {
                user: user
                  ? {
                      uid: user.uid,
                      email: user.email,
                      emailVerified: user.emailVerified,
                    }
                  : null,
                loading,
                error: error ? error.message : null,
                loggedIn,
                isDevelopment,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Auth State</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Session Cookie</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {sessionCookie
              ? `Session cookie exists (${sessionCookie.substring(0, 20)}...)`
              : "No session cookie found"}
          </pre>
        </div>

        <div className="flex space-x-4 mt-4">
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

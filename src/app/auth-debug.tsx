"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { initFirebase } from "@/lib/firebase/firebase";
import { signIn, signOut, checkAuthStatus } from "@/lib/firebase/authUtils";

export default function AuthDebugPage() {
  const { user, loading, loggedIn, error } = useAuth();
  const [email, setEmail] = useState("arnauros22@gmail.com");
  const [password, setPassword] = useState("password123");
  const [logs, setLogs] = useState<string[]>([]);
  const [authStatusData, setAuthStatusData] = useState<any>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prevLogs) => [
      ...prevLogs,
      `${new Date().toISOString()}: ${message}`,
    ]);
  };

  // Check if Firebase is initialized on mount
  useEffect(() => {
    try {
      const { app, auth, db } = initFirebase();
      addLog(
        `Firebase init check - App: ${app ? "✅" : "❌"}, Auth: ${
          auth ? "✅" : "❌"
        }, DB: ${db ? "✅" : "❌"}`
      );
    } catch (err) {
      addLog(
        `Firebase init error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }, []);

  // Log auth state changes
  useEffect(() => {
    addLog(
      `Auth state update - Loading: ${loading}, LoggedIn: ${loggedIn}, User: ${
        user ? user.email : "null"
      }`
    );
  }, [loading, loggedIn, user]);

  const handleLogin = async () => {
    addLog("Login attempt started");
    try {
      const result = await signIn(email, password);
      if (result.error) {
        addLog(`Login error: ${result.error.code} - ${result.error.message}`);
      } else {
        addLog(`Login success: ${result.user?.email}`);
      }
    } catch (err) {
      addLog(
        `Login exception: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleLogout = async () => {
    addLog("Logout attempt started");
    try {
      const result = await signOut();
      if (result.error) {
        addLog(`Logout error: ${result.error.code} - ${result.error.message}`);
      } else {
        addLog("Logout success");
      }
    } catch (err) {
      addLog(
        `Logout exception: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleCheckAuthStatus = async () => {
    addLog("Checking auth status...");
    try {
      const status = await checkAuthStatus();
      setAuthStatusData(status);
      addLog(`Auth status check: ${JSON.stringify(status, null, 2)}`);
    } catch (err) {
      addLog(
        `Auth status check error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>

          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Auth State</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-600">Loading:</div>
              <div>{loading ? "True" : "False"}</div>

              <div className="text-gray-600">Logged In:</div>
              <div>{loggedIn ? "True" : "False"}</div>

              <div className="text-gray-600">User:</div>
              <div>{user ? user.email : "None"}</div>

              <div className="text-gray-600">User ID:</div>
              <div>{user ? user.uid : "None"}</div>

              <div className="text-gray-600">Auth Error:</div>
              <div>{error ? error.message : "None"}</div>
            </div>
          </div>

          {authStatusData && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-xl font-semibold mb-2">
                Auth Status Check Results
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600">Auth Initialized:</div>
                <div>{authStatusData.isInitialized ? "Yes" : "No"}</div>

                <div className="text-gray-600">User Authenticated:</div>
                <div>{authStatusData.isAuthenticated ? "Yes" : "No"}</div>

                {authStatusData.error && (
                  <>
                    <div className="text-gray-600">Error:</div>
                    <div className="text-red-600">{authStatusData.error}</div>
                  </>
                )}
              </div>
              <div className="mt-2">
                <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(authStatusData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Test Login</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleLogin}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Login
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Logout
                </button>
                <button
                  onClick={handleCheckAuthStatus}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Check Auth Status
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-black rounded-lg">
            <h2 className="text-xl font-semibold mb-2 text-white">
              Debug Logs
            </h2>
            <div className="max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="text-sm text-green-400 font-mono whitespace-pre-wrap"
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-sm text-gray-400 font-mono">
                  No logs yet...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

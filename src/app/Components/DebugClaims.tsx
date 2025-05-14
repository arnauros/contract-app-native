"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-hot-toast";
import { signOut } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/firebase";

export default function DebugClaims() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [fixResult, setFixResult] = useState<any>(null);

  const checkClaims = async () => {
    if (!user) {
      toast.error("Not logged in");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/auth-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("User claims:", data);
      setClaims(data);
      toast.success("Claims retrieved successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching claims:", err);
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetUserClaims = async () => {
    if (!user) {
      toast.error("Not logged in");
      return;
    }

    setLoading(true);
    setAttempts((prev) => prev + 1);
    try {
      const response = await fetch("/api/debug/reset-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Reset claims result:", data);
      setClaims(data);
      toast.success("Claims reset successfully");

      // Force token refresh
      await user.getIdToken(true);
      toast.success("Token refreshed");

      // Set a timeout and then check the user's claims
      setTimeout(() => {
        checkClaims();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error resetting claims:", err);
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const forceTokenRefresh = async () => {
    if (!user) {
      toast.error("Not logged in");
      return;
    }

    try {
      setLoading(true);
      await user.getIdToken(true);
      toast.success("Token refreshed successfully");
      // Check claims after token refresh
      setTimeout(() => {
        checkClaims();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error refreshing token:", err);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fixPermissions = async () => {
    if (!user) {
      toast.error("Not logged in");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFixResult(null);

      // Call fix-permissions endpoint
      const response = await fetch("/api/debug/fix-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Fix permissions result:", data);
      setFixResult(data);

      if (data.success) {
        toast.success("Permissions fixed successfully");

        // Force token refresh
        await user.getIdToken(true);
        toast.success("Token refreshed");

        // Update claims display
        setClaims({
          ...claims,
          customClaims: data.afterFix.claims,
        });
      } else {
        toast.error(`Failed to fix permissions: ${data.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fixing permissions:", err);
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const reloadPage = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);

      if (!firebaseAuth) {
        throw new Error("Firebase auth not initialized");
      }

      await signOut(firebaseAuth);
      toast.success("Signed out successfully");

      // Redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error signing out:", err);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">User Claims Debug</h2>

      {user && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="font-mono text-sm mb-2">
            <strong>User ID:</strong>{" "}
            <span className="select-all">{user.uid}</span>
          </p>
          <p className="font-mono text-sm">
            <strong>Email:</strong> {user.email}
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={checkClaims}
          disabled={loading || !user}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          {loading ? "Loading..." : "Check Claims"}
        </button>

        <button
          onClick={resetUserClaims}
          disabled={loading || !user}
          className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
        >
          Reset Claims ({attempts})
        </button>

        <button
          onClick={forceTokenRefresh}
          disabled={loading || !user}
          className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
        >
          Force Token Refresh
        </button>

        <button
          onClick={fixPermissions}
          disabled={loading || !user}
          className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
        >
          Fix Permissions
        </button>

        <button
          onClick={reloadPage}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded"
        >
          Reload Page
        </button>

        <button
          onClick={handleSignOut}
          disabled={loading || !user}
          className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {fixResult && (
        <div className="my-4">
          <h3 className="text-lg font-medium mb-2">Fix Result:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs">
            {JSON.stringify(fixResult, null, 2)}
          </pre>
        </div>
      )}

      {claims && (
        <div>
          <h3 className="text-lg font-medium mb-2">Custom Claims:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs">
            {JSON.stringify(claims.customClaims, null, 2)}
          </pre>

          <h3 className="text-lg font-medium my-2">User Info:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs">
            {JSON.stringify(
              {
                uid: claims.uid,
                email: claims.email,
                displayName: claims.displayName,
                emailVerified: claims.emailVerified,
                metadata: claims.metadata,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "@/lib/firebase/authUtils";
import { useAuth } from "@/lib/hooks/useAuth";
import { User } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useDomain } from "@/lib/hooks/useDomain";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();
  const { user, loading: authLoading, loggedIn } = useAuth();
  const searchParams = useSearchParams();
  const { currentPort, createUrl } = useDomain();

  // Get returnUrl or redirect param, with fallback to dashboard
  const redirectParam = searchParams?.get("redirect");
  const returnUrlParam = searchParams?.get("returnUrl");
  const from = searchParams?.get("from");

  // Prioritize redirect param, then returnUrl, then from, with dashboard as fallback
  const returnUrl = redirectParam
    ? `/${redirectParam}`
    : returnUrlParam || from || "/dashboard";

  // Log all auth state changes for debugging
  useEffect(() => {
    console.log("Auth state in login page:", {
      user: user ? `${user.email} (${user.uid})` : null,
      authLoading,
      loggedIn,
      returnUrl,
    });

    setDebugInfo({
      hasUser: !!user,
      authLoading,
      loggedIn,
      returnUrl,
      timestamp: new Date().toISOString(),
    });
  }, [user, authLoading, loggedIn, returnUrl]);

  // Simple redirection once authenticated
  useEffect(() => {
    // Only redirect if auth is not in loading state and we have a user
    if (!authLoading && user) {
      console.log("User is authenticated, redirecting to:", returnUrl);

      // Create session cookie for authenticated user
      const createSession = async () => {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: idToken }),
          });

          if (!response.ok) {
            console.error("Failed to create session:", await response.json());
          } else {
            console.log("Session created successfully");
          }
        } catch (err) {
          console.error("Error creating session:", err);
        }
      };

      // Create session and then redirect
      createSession().then(() => {
        // Simple timeout to ensure UI updates before redirect
        const redirectTimer = setTimeout(() => {
          // Use router for client-side navigation when possible
          if (
            returnUrl.startsWith("/dashboard") ||
            returnUrl.startsWith("/pricing") ||
            returnUrl.startsWith("/test-flow")
          ) {
            router.push(returnUrl);
          } else {
            // Ensure the URL includes the correct port in development
            if (process.env.NODE_ENV === "development" && currentPort) {
              // Create a new URL with the current origin and correct port
              const url = new URL(returnUrl, window.location.origin);
              window.location.href = url.toString();
            } else {
              // Fallback to window.location for other cases
              window.location.href = returnUrl;
            }
          }
        }, 800); // Allow time for session creation

        return () => clearTimeout(redirectTimer);
      });
    }
  }, [user, authLoading, returnUrl, router, currentPort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    console.log("Login attempt with email:", email);

    try {
      // Sign in with Firebase authentication
      const result = await signIn(email, password);

      if (result.error) {
        const errorMsg = result.error.message || "Authentication failed";
        console.error("Authentication error:", result.error);
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } else if (result.user) {
        console.log("Login successful for user:", result.user.email);

        // Create session immediately after login, don't wait for the useEffect
        try {
          const idToken = await result.user.getIdToken();
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: idToken }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Session creation failed:", errorData);
            toast.error("Login successful, but session creation failed");
          } else {
            toast.success("Logged in successfully!");
            console.log("Session created successfully");
          }
        } catch (sessionError) {
          console.error("Error creating session:", sessionError);
          toast.error("Login successful, but session creation failed");
        }

        // The useEffect will handle redirection once auth state updates
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Failed to login. Please try again.");
      toast.error("Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner during auth state loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Checking authentication status...
          </p>
        </div>
      </div>
    );
  }

  // If already logged in, show a simple message with redirection
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-green-600 text-xl font-semibold mb-2">
            ✓ Logged in successfully
          </div>
          <p className="mb-4">You are logged in as {user.email}</p>
          <p className="text-gray-600">Redirecting you to {returnUrl}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {returnUrl.includes("/pricing") && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to continue with your subscription
            </p>
          )}
          {returnUrl.includes("/test-flow") && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to continue with the subscription test flow
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link
            href={`/signup${
              returnUrl !== "/dashboard"
                ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                : ""
            }`}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Don't have an account? Sign up
          </Link>
        </div>

        {/* Debug info if needed */}
        {process.env.NODE_ENV === "development" && debugInfo && (
          <div className="mt-4 text-xs text-gray-500 border-t pt-4">
            <details>
              <summary>Debug info</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

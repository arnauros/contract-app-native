"use client";

import { useState } from "react";
import { signIn } from "@/lib/firebase/authUtils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Cookies from "js-cookie";

export default function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Record<string, any>>({});
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setStatus({
      step: "Attempting login...",
    });

    try {
      // Clear existing cookies to prevent conflicts
      Cookies.remove("session");

      // Attempt login
      const result = await signIn(email, password);

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.user) {
        // Get token for session
        const idToken = await result.user.getIdToken();

        // Create session
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: idToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Session API failed: ${errorData.error || response.status}`
          );
        }

        // Redirect to dashboard after successful login
        router.push("/dashboard");
      }
    } catch (error: any) {
      setStatus({
        overall: "Failed",
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Sign In</h1>
          <p className="mt-2 text-gray-600">
            Enter your credentials to access your account
          </p>
        </div>

        <div className="bg-white p-6 shadow rounded-lg">
          {status.error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {status.error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

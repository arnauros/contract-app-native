"use client";

import { useState, useEffect } from "react";
import { signIn } from "@/lib/firebase/authUtils";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import Cookies from "js-cookie";

interface AuthResult {
  user: User | null;
  error: { code: string; message: string } | null;
}

export default function TestClientLogin() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Test123!");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Record<string, any>>({});
  const { user, loading: authLoading, error: authError } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setStatus({
      step: "Attempting login...",
    });

    try {
      // Clear existing cookies
      Cookies.remove("session");
      Cookies.remove("subscription_status");

      // Attempt client login
      setStatus((prev) => ({ ...prev, clientAuth: "Attempting..." }));
      const result = (await signIn(email, password)) as AuthResult;

      setStatus((prev) => ({
        ...prev,
        clientAuth: result.error ? "Failed" : "Success",
        error: result.error?.message,
        user: result.user
          ? {
              uid: result.user.uid,
              email: result.user.email,
            }
          : null,
      }));

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.user) {
        // Get token for session
        setStatus((prev) => ({ ...prev, idToken: "Attempting..." }));
        const idToken = await result.user.getIdToken();
        setStatus((prev) => ({
          ...prev,
          idToken: "Success",
          sessionApi: "Attempting...",
        }));

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
          setStatus((prev) => ({
            ...prev,
            sessionApi: "Failed",
            sessionError: errorData.error || "Unknown error",
          }));
          throw new Error(
            `Session API failed: ${errorData.error || response.status}`
          );
        }

        setStatus((prev) => ({ ...prev, sessionApi: "Success" }));

        // Check cookies are set
        setTimeout(() => {
          const sessionCookie = Cookies.get("session");
          const subscriptionStatus = Cookies.get("subscription_status");
          setStatus((prev) => ({
            ...prev,
            cookies: {
              session: sessionCookie ? "Set" : "Not set",
              subscriptionStatus: subscriptionStatus || "Not set",
            },
          }));
        }, 500);
      }

      setStatus((prev) => ({ ...prev, overall: "Success" }));
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        overall: "Failed",
        finalError: error.message,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Client Login Test
          </h1>
          <p className="mt-2 text-gray-600">
            Test the client-side login functionality
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Auth Status
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Loading</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {authLoading ? "True" : "False"}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Authenticated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {user ? "Yes" : "No"}
                </dd>
              </div>
              {user && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">User</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user.email} (UID: {user.uid})
                  </dd>
                </div>
              )}
              {authError && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-red-500">Error</dt>
                  <dd className="mt-1 text-sm text-red-600 sm:mt-0 sm:col-span-2">
                    {authError.message}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Login Test
            </h3>
            <div className="space-y-6">
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
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Test Login"}
              </button>
            </div>
          </div>
        </div>

        {Object.keys(status).length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Test Results
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                {Object.entries(status).map(([key, value]) => {
                  if (typeof value === "object" && value !== null) {
                    return (
                      <div
                        key={key}
                        className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
                      >
                        <dt className="text-sm font-medium text-gray-500">
                          {key}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <pre className="bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </dd>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
                    >
                      <dt className="text-sm font-medium text-gray-500">
                        {key}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {String(value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

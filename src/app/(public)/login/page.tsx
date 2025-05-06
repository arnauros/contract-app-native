"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl") || "/dashboard";

  useEffect(() => {
    if (user) {
      if (returnUrl.startsWith("/api/") || returnUrl.startsWith("/dashboard")) {
        router.push(returnUrl);
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      // Step 1: Sign in with Firebase authentication
      const result = await signIn(email, password);

      if (result.error) {
        const errorMsg = result.error.message || "Authentication failed";
        console.error("Authentication error:", result.error);
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (result.user) {
        try {
          // Step 2: Get the ID token to create a session cookie
          const idToken = await result.user.getIdToken();

          // Step 3: Create server-side session cookie
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: idToken }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || "Failed to create session";
            console.error("Session error:", errorData);
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
          }

          // Success
          console.log("Login successful");
          toast.success("Logged in successfully!");

          // Redirect based on returnUrl
          if (
            returnUrl.startsWith("/api/") ||
            returnUrl.startsWith("/dashboard")
          ) {
            // Wait briefly for session cookie to be set
            setTimeout(() => {
              window.location.href = returnUrl;
            }, 500);
          } else {
            window.location.href = "/dashboard";
          }
        } catch (sessionError) {
          console.error("Session creation error:", sessionError);
          toast.error(
            "Login successful, but session creation failed. Please try again."
          );
          // Force sign out since session creation failed
          await signOut();
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Failed to login. Please try again.");
      toast.error("Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {returnUrl.includes("direct-checkout") && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to continue with your subscription
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
      </div>
    </div>
  );
}

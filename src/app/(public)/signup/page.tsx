"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/lib/firebase/authUtils";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "@/lib/firebase/firebase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await signUp(email, password);

      if (result.error) {
        const errorMsg = result.error.message || "Failed to create account";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      if (result.user && app) {
        // Initialize Firestore
        const db = getFirestore(app);

        // Create a user document with default subscription data
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          createdAt: new Date(),
          subscription: {
            tier: "free",
            status: "inactive",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          },
        });

        // Get the ID token
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
            `Failed to create session: ${errorData.error || "Unknown error"}`
          );
        }

        toast.success("Account created successfully!");

        // Check if we should redirect to a specific URL after signup
        if (
          returnUrl.startsWith("/api/") ||
          returnUrl.startsWith("/dashboard")
        ) {
          // Wait a brief moment for the session cookie to be set
          setTimeout(() => {
            router.push(returnUrl);
          }, 500);
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to create account. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          {returnUrl.includes("direct-checkout") && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign up to continue with your subscription
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
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link
            href={`/login${
              returnUrl !== "/dashboard"
                ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                : ""
            }`}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

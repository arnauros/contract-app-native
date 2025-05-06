"use client";

import { useState, useEffect } from "react";

export default function TestConfigPage() {
  const [status, setStatus] = useState({
    firebase: "Loading...",
    stripe: "Loading...",
    env: "Checking...",
  });
  const [details, setDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    // Test Firebase
    const checkFirebase = async () => {
      try {
        const firebase = await import("@/lib/firebase/config");
        if (firebase.app) {
          setStatus((prev) => ({ ...prev, firebase: "Initialized" }));
          setDetails((prev) => ({
            ...prev,
            firebase: {
              initialized: true,
              auth: !!firebase.auth,
              db: !!firebase.db,
            },
          }));
        } else {
          setStatus((prev) => ({ ...prev, firebase: "Failed" }));
        }
      } catch (error) {
        console.error("Firebase error:", error);
        setStatus((prev) => ({ ...prev, firebase: "Error" }));
        setDetails((prev) => ({
          ...prev,
          firebaseError: error instanceof Error ? error.message : String(error),
        }));
      }
    };

    // Test Stripe
    const checkStripe = async () => {
      try {
        const { getStripe, STRIPE_PRICE_IDS } = await import(
          "@/lib/stripe/config"
        );
        const stripe = await getStripe();
        if (stripe) {
          setStatus((prev) => ({ ...prev, stripe: "Loaded" }));
          setDetails((prev) => ({
            ...prev,
            stripe: {
              loaded: true,
              priceIds: STRIPE_PRICE_IDS,
            },
          }));
        } else {
          setStatus((prev) => ({ ...prev, stripe: "Failed" }));
        }
      } catch (error) {
        console.error("Stripe error:", error);
        setStatus((prev) => ({ ...prev, stripe: "Error" }));
        setDetails((prev) => ({
          ...prev,
          stripeError: error instanceof Error ? error.message : String(error),
        }));
      }
    };

    // Check environment variables
    const checkEnv = () => {
      try {
        const envVars = {
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
          NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
            ? "Set"
            : "Not set",
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env
            .NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
            ? "Set"
            : "Not set",
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env
            .NEXT_PUBLIC_FIREBASE_PROJECT_ID
            ? "Set"
            : "Not set",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env
            .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
            ? "Set"
            : "Not set",
        };

        setStatus((prev) => ({ ...prev, env: "Checked" }));
        setDetails((prev) => ({ ...prev, env: envVars }));
      } catch (error) {
        setStatus((prev) => ({ ...prev, env: "Error" }));
      }
    };

    checkFirebase();
    checkStripe();
    checkEnv();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Configuration Test</h1>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className={`p-4 rounded-lg ${
                status.firebase === "Initialized"
                  ? "bg-green-100"
                  : "bg-red-100"
              }`}
            >
              <h2 className="text-lg font-semibold mb-1">Firebase</h2>
              <p
                className={
                  status.firebase === "Initialized"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {status.firebase}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                status.stripe === "Loaded" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <h2 className="text-lg font-semibold mb-1">Stripe</h2>
              <p
                className={
                  status.stripe === "Loaded" ? "text-green-600" : "text-red-600"
                }
              >
                {status.stripe}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-100">
              <h2 className="text-lg font-semibold mb-1">Environment</h2>
              <p className="text-blue-600">{status.env}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Details</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between">
              <a
                href="/subscribe"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Go to Subscribe Page
              </a>

              <a
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

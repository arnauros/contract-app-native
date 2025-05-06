"use client";

import { useEffect, useState } from "react";

export default function SubscribeDebug() {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Override console.error to capture Firebase and other errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);

      // Convert arguments to string and capture
      const errorString = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");

      setErrors((prev) => [...prev, errorString]);
    };

    // Attempt to initialize Firebase manually to see errors
    const testFirebase = async () => {
      try {
        // Test Firebase initialization
        await import("@/lib/firebase/config");
        console.log("Firebase initialization test completed");
      } catch (error) {
        console.error("Firebase test error:", error);
      }
    };

    // Test Stripe configuration
    const testStripe = async () => {
      try {
        const { getStripe } = await import("@/lib/stripe/config");
        const stripe = await getStripe();
        console.log(
          "Stripe loading test complete:",
          stripe ? "loaded" : "failed"
        );
      } catch (error) {
        console.error("Stripe test error:", error);
      }
    };

    testFirebase();
    testStripe();

    // Check environment variables that might be causing issues
    console.log("App URL:", process.env.NEXT_PUBLIC_APP_URL);
    console.log(
      "Firebase API Key set:",
      !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    );
    console.log(
      "Stripe Publishable Key set:",
      !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );

    // Cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <div className="p-4 bg-red-50 rounded-lg mt-4 max-w-full">
      <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
      {errors.length === 0 ? (
        <p className="text-green-600">No errors detected</p>
      ) : (
        <div className="space-y-2">
          <p className="text-red-600 font-medium">Errors detected:</p>
          <ul className="list-disc pl-5 space-y-1 max-h-80 overflow-auto">
            {errors.map((error, index) => (
              <li key={index} className="text-xs break-words">
                <pre className="bg-red-100 p-2 rounded overflow-x-auto">
                  {error}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

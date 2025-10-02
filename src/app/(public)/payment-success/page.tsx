"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

// Declare global types and variables
declare global {
  interface Window {
    CHECKOUT_LOCK_CLEARED?: boolean;
    CHECKOUT_CLEARED_ON_MOUNT?: boolean;
    GLOBAL_CHECKOUT_LOCK?: boolean;
    GLOBAL_REDIRECT_IN_PROGRESS?: boolean;
  }
}

function PaymentSuccessContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");
  const checkoutId = searchParams?.get("checkout_id");
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);
  const [cleanupPerformed, setCleanupPerformed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  // Function to thoroughly clear all checkout flags
  const thoroughCleanup = () => {
    console.log("Performing thorough checkout flag cleanup");

    // Clear all localStorage flags
    const checkoutFlags = [
      "checkout_in_progress",
      "subscription_intent",
      "last_checkout_attempt",
      "checkout_start_time",
      "checkout_session_id",
      "checkout_price_id",
      "checkout_timestamp",
      "last_checkout_error",
      "last_checkout_redirect_time", // Clear the redirect tracking
    ];

    checkoutFlags.forEach((flag) => {
      if (localStorage.getItem(flag)) {
        console.log(`Clearing localStorage flag: ${flag}`);
        localStorage.removeItem(flag);
      }
    });

    // Clear global variables if they exist
    if (typeof window !== "undefined") {
      // Set the cleared flags
      window.CHECKOUT_LOCK_CLEARED = true;
      window.CHECKOUT_CLEARED_ON_MOUNT = true;

      // Reset the global locks if they exist in this context
      if ("GLOBAL_CHECKOUT_LOCK" in window) {
        console.log("Resetting window.GLOBAL_CHECKOUT_LOCK");
        window.GLOBAL_CHECKOUT_LOCK = false;
      }

      // Reset the SubscriptionGuard redirect flag
      if ("GLOBAL_REDIRECT_IN_PROGRESS" in window) {
        console.log("Resetting window.GLOBAL_REDIRECT_IN_PROGRESS");
        window.GLOBAL_REDIRECT_IN_PROGRESS = false;
      }
    }

    setCleanupPerformed(true);
  };

  // Function to verify the payment status with Stripe
  const verifyPaymentStatus = async (sid: string) => {
    try {
      console.log(`Verifying payment session: ${sid}`);

      const response = await fetch("/api/stripe/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sid }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Session verification failed:", errorText);
        setVerificationError(`Failed to verify session: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log("Session verification result:", data);

      // If the payment is verified, set subscription as confirmed
      if (data.verified || data.isSubscriptionActive) {
        setSubscriptionConfirmed(true);
        return true;
      }

      // As a fallback, check the user's subscription directly
      return checkUserSubscription();
    } catch (error) {
      console.error("Error verifying payment status:", error);
      setVerificationError(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );

      // Try fallback verification
      return checkUserSubscription();
    } finally {
      setVerificationAttempted(true);
    }
  };

  // Fallback: check user's subscription status directly from Firestore
  const checkUserSubscription = async () => {
    if (!user) return false;

    try {
      console.log("Performing fallback subscription check for user:", user.uid);

      const response = await fetch("/api/stripe/verify-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        console.error(
          "Subscription verification failed:",
          await response.text()
        );
        return false;
      }

      const data = await response.json();
      console.log("User subscription status:", data);

      if (data.isActive) {
        console.log("Confirmed active subscription via fallback check");
        setSubscriptionConfirmed(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error in fallback subscription check:", error);
      return false;
    }
  };

  useEffect(() => {
    // Immediately perform cleanup when component mounts
    thoroughCleanup();

    // Set a recurring interval to keep checking and clearing flags
    // This helps ensure that even if new flags are set somehow, they get cleared
    const cleanupInterval = setInterval(() => {
      thoroughCleanup();
    }, 10000); // Check every 10 seconds while on this page

    // If user is not authenticated, redirect to login
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // When user is authenticated, attempt to verify the session
    if (!authLoading && user && sessionId && !verificationAttempted) {
      console.log("Payment completed with session ID:", sessionId);

      // Verify the payment status with Stripe
      verifyPaymentStatus(sessionId).then(async (verified) => {
        if (verified) {
          console.log(
            "Payment successfully verified, creating session and redirecting to dashboard"
          );
          
          // Create session cookie to allow dashboard access
          try {
            if (user) {
              const { createSession } = await import("@/lib/firebase/authUtils");
              const sessionResult = await createSession(user);
              if (sessionResult.success) {
                console.log("Session created successfully after payment");
              } else {
                console.error("Failed to create session after payment:", sessionResult.error);
              }
            }
          } catch (sessionError) {
            console.error("Error creating session after payment:", sessionError);
          }
          
          // Set a timeout to redirect after successful verification
          const timer = setTimeout(() => {
            setRedirecting(true);
            router.push("/dashboard");
          }, 3000);

          return () => clearTimeout(timer);
        } else {
          console.warn(
            "Payment verification failed. Not redirecting to dashboard."
          );
        }
      });
    } else if (!authLoading && user && !sessionId && !verificationAttempted) {
      // Handle case where session ID is missing
      console.warn(
        "Session ID is missing from URL. Payment might not be properly tracked."
      );
      setVerificationError(
        "Session ID is missing. Your payment might still be processing."
      );
      setVerificationAttempted(true);

      // Still redirect after a delay, but log the issue
      const timer = setTimeout(() => {
        console.log("Redirecting to dashboard despite missing session ID");
        setRedirecting(true);
        router.push("/dashboard");
      }, 5000);

      return () => clearTimeout(timer);
    }

    return () => {
      clearInterval(cleanupInterval);
      thoroughCleanup();
    };
  }, [user, authLoading, router, sessionId, verificationAttempted]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your subscription. Your account has been upgraded
          successfully.
        </p>

        {verificationError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            {verificationError}
          </div>
        )}

        {redirecting ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Redirecting you to the dashboard...
            </p>
            <div className="animate-pulse rounded-full h-2 w-32 bg-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {subscriptionConfirmed
                ? "Your subscription is confirmed. You'll be redirected shortly..."
                : "Your subscription is being processed. You'll be redirected shortly..."}
            </p>
            <div className="animate-pulse rounded-full h-2 w-32 bg-indigo-600 mx-auto"></div>
          </div>
        )}

        {/* Debug info (only visible in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 text-left text-xs text-gray-400 border-t pt-4">
            <p>Debug Info:</p>
            <p>Session ID: {sessionId || "none"}</p>
            <p>Checkout ID: {checkoutId || "none"}</p>
            <p>
              Verification attempted: {verificationAttempted ? "yes" : "no"}
            </p>
            <p>
              Subscription confirmed: {subscriptionConfirmed ? "yes" : "no"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // When user is authenticated, set redirecting after a delay
    // This gives time for the Stripe webhook to process the subscription
    if (!authLoading && user) {
      console.log("Payment completed with session ID:", sessionId);

      // Set a timeout to redirect after 5 seconds
      // The Stripe webhook should update the subscription in Firestore
      const timer = setTimeout(() => {
        setRedirecting(true);
        router.push("/dashboard");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, authLoading, router, sessionId]);

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
              Your subscription is being processed. You'll be redirected
              shortly...
            </p>
            <div className="animate-pulse rounded-full h-2 w-32 bg-indigo-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}

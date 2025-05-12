import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { UserSubscription } from "@/lib/stripe/config";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useDomain } from "@/lib/hooks/useDomain";
import { app } from "@/lib/firebase/firebase";

export function SubscriptionStatus() {
  const { user } = useAuth();
  const {
    openCustomerPortal,
    loading,
    error: subscriptionError,
  } = useSubscription();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [error, setError] = useState<Error | null>(null);
  const { isLocalDevelopment } = useDomain();

  useEffect(() => {
    if (!user) return;

    try {
      const db = getFirestore();

      // Safe guard in case Firestore isn't initialized properly
      if (!db) {
        console.error("Firestore not initialized in SubscriptionStatus");
        setError(new Error("Database connection issue"));
        return;
      }

      const unsubscribe = onSnapshot(
        doc(db, "users", user.uid),
        (docSnapshot) => {
          try {
            const data = docSnapshot.data();
            setSubscription(data?.subscription || null);
          } catch (err) {
            console.error("Error processing subscription data:", err);
            setError(err instanceof Error ? err : new Error("Unknown error"));
          }
        },
        (firestoreError) => {
          console.error("Error fetching subscription:", firestoreError);
          setError(firestoreError);
        }
      );

      return () => {
        try {
          unsubscribe();
        } catch (err) {
          console.error("Error unsubscribing from snapshot:", err);
        }
      };
    } catch (err) {
      console.error("Error setting up subscription listener:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    }
  }, [user]);

  // Handle errors
  if (error || subscriptionError) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Subscription service error
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Unable to load subscription information. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not in local development or user not authenticated
  if (!isLocalDevelopment || !user) {
    return null;
  }

  // Show the free tier message if no subscription
  if (!subscription) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              No active subscription
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Subscribe to access premium features.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Subscription Status
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Your subscription is currently{" "}
            <span className="font-medium text-gray-900">
              {subscription.status}
            </span>
            .
          </p>
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={openCustomerPortal}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Manage Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { UserSubscription } from "@/lib/stripe/config";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useDomain } from "@/lib/hooks/useDomain";

export function SubscriptionStatus() {
  const { user } = useAuth();
  const { openCustomerPortal, loading } = useSubscription();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const { isAppLocal } = useDomain();

  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (doc) => {
        const data = doc.data();
        setSubscription(data?.subscription || null);
      },
      (error) => {
        console.error("Error fetching subscription:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!isAppLocal) {
    return null;
  }

  if (!user) {
    return null;
  }

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

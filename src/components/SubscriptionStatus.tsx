import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { UserSubscription } from "@/lib/stripe/config";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { isLocalDevelopment } from "@/lib/utils";
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
  const [errorCount, setErrorCount] = useState(0);

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

      // Use a try-catch pattern for more robust error handling
      const fetchSubscription = async () => {
        try {
          // Monitor user document for subscription changes
          const unsubscribe = onSnapshot(
            doc(db, "users", user.uid),
            (docSnapshot) => {
              try {
                const data = docSnapshot.data();
                setSubscription(data?.subscription || null);
                // Reset error state if successful
                setError(null);
                setErrorCount(0);
              } catch (err) {
                console.error("Error processing subscription data:", err);
                setError(
                  err instanceof Error ? err : new Error("Unknown error")
                );
                setErrorCount((prev) => prev + 1);
              }
            },
            (firestoreError) => {
              console.error("Error fetching subscription:", firestoreError);

              // Increment error counter
              setErrorCount((prev) => prev + 1);

              // Log permission errors but don't create fake subscriptions
              if (firestoreError.code === "permission-denied") {
                console.log("Permission error fetching subscription");
              }

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
        } catch (outerError) {
          console.error("Error setting up subscription listener:", outerError);
          setError(
            outerError instanceof Error
              ? outerError
              : new Error("Unknown error")
          );
          setErrorCount((prev) => prev + 1);
        }
      };

      fetchSubscription();
    } catch (err) {
      console.error("Error setting up subscription listener:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setErrorCount((prev) => prev + 1);
    }
  }, [user]);

  // Display error state if multiple attempts have failed
  if (error && errorCount > 2) {
    return (
      <div className="text-center py-2 px-4 rounded-full bg-red-100 text-red-800 text-sm inline-flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Error checking subscription status
      </div>
    );
  }

  // Loading state
  if (loading || !subscription) {
    return null; // Hide component while loading
  }

  // Subscription active
  if (
    subscription?.status === "active" ||
    subscription?.status === "trialing"
  ) {
    return (
      <div className="text-center py-2 px-4 rounded-full bg-green-100 text-green-800 text-sm inline-flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Active subscription
      </div>
    );
  }

  // Inactive subscription
  return (
    <div className="text-center py-2 px-4 rounded-full bg-yellow-100 text-yellow-800 text-sm inline-flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Inactive subscription
    </div>
  );
}

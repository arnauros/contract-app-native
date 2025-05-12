"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { UserSubscription } from "@/lib/stripe/config";
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

export function useUserSubscription() {
  const { user, loggedIn } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !loggedIn) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const db = getFirestore();

      // First check the customers/{userId}/subscriptions collection
      const unsubscribe = onSnapshot(
        collection(db, "customers", user.uid, "subscriptions"),
        (snapshot) => {
          if (!snapshot.empty) {
            // Get the most recent subscription
            const activeSubscriptions = snapshot.docs.filter(
              (doc) =>
                doc.data().status === "active" ||
                doc.data().status === "trialing"
            );

            if (activeSubscriptions.length > 0) {
              const subData = activeSubscriptions[0].data() as UserSubscription;
              setSubscription({
                customerId: user.uid,
                subscriptionId: activeSubscriptions[0].id,
                status: subData.status || "active",
                tier: subData.tier || "pro",
                currentPeriodEnd:
                  subData.currentPeriodEnd || Date.now() + 86400000,
                cancelAtPeriodEnd: subData.cancelAtPeriodEnd || false,
              });
            } else {
              // No active subscription
              setSubscription({
                customerId: user.uid,
                subscriptionId: "free-tier",
                status: "inactive",
                tier: "free",
                currentPeriodEnd: Date.now(),
                cancelAtPeriodEnd: false,
              });
            }
          } else {
            // No subscriptions found, check user document
            getDoc(doc(db, "users", user.uid))
              .then((userDoc) => {
                if (userDoc.exists() && userDoc.data().subscription) {
                  setSubscription(userDoc.data().subscription);
                } else {
                  // Default to free tier
                  setSubscription({
                    customerId: user.uid,
                    subscriptionId: "free-tier",
                    status: "inactive",
                    tier: "free",
                    currentPeriodEnd: Date.now(),
                    cancelAtPeriodEnd: false,
                  });
                }
              })
              .catch((err) => {
                console.error("Error getting user document:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
              })
              .finally(() => {
                setLoading(false);
              });
          }
          setLoading(false);
        },
        (err) => {
          console.error("Error listening to subscriptions:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up subscription listener:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [user, loggedIn]);

  return {
    subscription,
    loading,
    error,
    // Helper for checking subscription status
    isActive:
      subscription?.status === "active" || subscription?.status === "trialing",
    isPro:
      subscription?.tier === "pro" &&
      (subscription?.status === "active" ||
        subscription?.status === "trialing"),
    isFree:
      !subscription ||
      subscription.tier === "free" ||
      subscription.status !== "active",
  };
}

"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  getFirestore,
  doc,
  getDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useDomain } from "@/lib/hooks/useDomain";

// Email addresses that are allowed to bypass the subscription check
const BYPASS_EMAILS = [
  "arnauros22@gmail.com", // Add your development email here
  "admin@example.com", // Example admin email
];

export function SubscriptionGuard({
  children,
  bypassInDevelopment = true, // Allow bypassing in development mode
}: {
  children: React.ReactNode;
  bypassInDevelopment?: boolean;
}) {
  const { user, loading, isDevelopment } = useAuth();
  const router = useRouter();
  const { isLocalDevelopment } = useDomain();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check if this is a special user that can bypass subscription checks
  const isSpecialUser = user && BYPASS_EMAILS.includes(user.email || "");

  // Check if we're in development mode and should bypass
  const shouldBypassCheck =
    (bypassInDevelopment && isDevelopment) || isSpecialUser;

  // Check subscription status
  useEffect(() => {
    if (loading) return; // Wait for auth to load

    // If no user, redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // If we should bypass the check, skip the verification
    if (shouldBypassCheck) {
      console.log(
        `Bypassing subscription check for ${user.email} (${
          isSpecialUser ? "special user" : "development mode"
        })`
      );
      setHasSubscription(true);
      setCheckingSubscription(false);
      return;
    }

    // Check subscription status
    const checkSubscription = async () => {
      try {
        const db = getFirestore();
        if (!db) {
          console.error("Firestore not initialized");
          return false;
        }

        // First check if the user has admin role
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === "admin") {
          console.log(
            `User ${user.email} has admin role, bypassing subscription check`
          );
          setHasSubscription(true);
          setCheckingSubscription(false);
          return true;
        }

        // Check for active subscription
        const subscriptionsRef = collection(
          db,
          "customers",
          user.uid,
          "subscriptions"
        );
        const q = query(
          subscriptionsRef,
          where("status", "in", ["trialing", "active"])
        );
        const snapshot = await getDocs(q);

        // Also check user's subscription in users collection (backup)
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("uid", "==", user.uid));
        const userSnapshot = await getDocs(userQuery);

        let subscriptionFound = false;

        // Check if subscription exists in subscriptions collection
        if (!snapshot.empty) {
          subscriptionFound = true;
        }

        // Or check if user has subscription data
        if (!subscriptionFound && !userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          if (
            userData.subscription &&
            userData.subscription.status === "active"
          ) {
            subscriptionFound = true;
          }
        }

        console.log(
          `Subscription check for ${user.email}: ${
            subscriptionFound ? "Active" : "Not active"
          }`
        );

        setHasSubscription(subscriptionFound);
        setCheckingSubscription(false);

        if (!subscriptionFound) {
          toast.error("You need an active subscription to access this page");
          router.push("/pricing");
        }

        return subscriptionFound;
      } catch (error) {
        console.error("Error checking subscription:", error);
        setCheckingSubscription(false);
        setHasSubscription(false);
        toast.error("Error checking subscription status");
        router.push("/pricing");
        return false;
      }
    };

    checkSubscription();
  }, [user, loading, router, shouldBypassCheck, isSpecialUser]);

  // Show loading state
  if (loading || checkingSubscription) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // If subscription is valid, render children
  if (hasSubscription) {
    return <>{children}</>;
  }

  // Otherwise return null (component will redirect in useEffect)
  return null;
}

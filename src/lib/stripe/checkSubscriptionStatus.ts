import {
  collection,
  getFirestore,
  query,
  where,
  getDocs,
  Firestore,
} from "firebase/firestore";
import { app, db, initFirebase } from "@/lib/firebase/firebase";

/**
 * Checks if a user has an active subscription
 * @param userId Firebase user ID
 * @returns Promise resolving to boolean indicating subscription status
 */
export const checkUserSubscription = async (
  userId: string
): Promise<boolean> => {
  try {
    // Initialize Firebase if not already done
    initFirebase();

    // Use the existing db instance if available
    let firestore: Firestore | null = db;

    // If db is not available, try to get a new instance if app is available
    if (!firestore && app) {
      firestore = getFirestore(app);
    }

    if (!firestore) {
      console.error("Firebase Firestore not initialized");
      return false;
    }

    // Query for active subscriptions
    const subscriptionsRef = collection(
      firestore,
      "customers",
      userId,
      "subscriptions"
    );
    const q = query(
      subscriptionsRef,
      where("status", "in", ["trialing", "active"])
    );

    // Execute the query
    const snapshot = await getDocs(q);

    // Check if any active subscriptions exist
    const hasActiveSubscription = !snapshot.empty;
    console.log(
      `User ${userId} subscription status:`,
      hasActiveSubscription ? "Active" : "Not active",
      `(${snapshot.size} subscriptions found)`
    );

    return hasActiveSubscription;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
};

/**
 * Gets detailed subscription information for a user
 * @param userId Firebase user ID
 * @returns Promise resolving to an array of subscription data
 */
export const getUserSubscriptions = async (userId: string) => {
  try {
    // Initialize Firebase if not already done
    initFirebase();

    // Use the existing db instance if available
    let firestore: Firestore | null = db;

    // If db is not available, try to get a new instance if app is available
    if (!firestore && app) {
      firestore = getFirestore(app);
    }

    if (!firestore) {
      console.error("Firebase Firestore not initialized");
      return [];
    }

    // Query for all user subscriptions
    const subscriptionsRef = collection(
      firestore,
      "customers",
      userId,
      "subscriptions"
    );
    const snapshot = await getDocs(subscriptionsRef);

    // Map snapshot to array of subscription data
    const subscriptions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return subscriptions;
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    return [];
  }
};

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStripe, validatePriceIds } from "@/lib/stripe/config";
import toast from "react-hot-toast";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { app, db as firebaseDB } from "@/lib/firebase/firebase";

export function useSubscription() {
  const { user, loading: authLoading, loggedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure the hook doesn't crash on initialization
  useEffect(() => {
    try {
      console.log("useSubscription hook - auth state:", {
        loggedIn,
        authLoading,
        userId: user?.uid || "not authenticated",
      });
    } catch (e) {
      console.error("Error in useSubscription initialization:", e);
    }
  }, [user, authLoading, loggedIn]);

  const createCheckoutSession = async (priceId: string) => {
    try {
      console.log("createCheckoutSession called with:", { priceId });
      console.log("Current auth state:", {
        loggedIn,
        authLoading,
        userId: user?.uid || "null",
      });

      setLoading(true);
      setError(null);

      // Don't proceed if user is not available
      if (!user) {
        const errorMsg = "User not authenticated";
        console.error("Checkout error: User not authenticated");
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      const userId = user.uid;

      // Check if Firebase DB is initialized
      if (!firebaseDB) {
        throw new Error("Firestore not initialized");
      }

      // Use Firestore to create a checkout session
      const checkoutSessionRef = collection(
        firebaseDB,
        "customers",
        userId,
        "checkout_sessions"
      );

      toast.loading("Preparing checkout...");

      // Add the checkout session document
      const docRef = await addDoc(checkoutSessionRef, {
        price: priceId,
        success_url: window.location.origin + "/dashboard",
        cancel_url: window.location.origin + "/pricing",
      });

      // Wait for the extension to update the document with a URL
      const unsubscribe = onSnapshot(docRef, async (snap) => {
        try {
          const data = snap.data();
          const url = data?.url;
          const error = data?.error;

          if (error) {
            // Handle error case
            toast.dismiss();
            toast.error(`An error occurred: ${error.message}`);
            setError(error.message);
            setLoading(false);
            unsubscribe();
            return;
          }

          if (url) {
            // Success! We have a Stripe Checkout URL
            toast.dismiss();
            toast.success("Redirecting to Stripe checkout...");
            console.log("Redirecting to Stripe checkout URL:", url);

            // Redirect to the Stripe Checkout page
            window.location.href = url;
            unsubscribe();
          }
        } catch (snapshotError) {
          console.error("Error in checkout session snapshot:", snapshotError);
          toast.dismiss();
          toast.error("Error processing checkout. Please try again.");
          setLoading(false);
          unsubscribe();
        }
      });
    } catch (err) {
      console.error("Checkout error:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An error occurred during checkout";
      setError(errorMsg);
      toast.dismiss();
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      const errorMsg = "User not authenticated";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Show loading toast
      const loadingToast = toast.loading("Preparing customer portal...");

      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        const errorMessage = errorData.error || `API error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const { url, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      toast.success("Redirecting to customer portal...");

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (err) {
      console.error("Portal error:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An error occurred accessing the customer portal";
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createCheckoutSession,
    openCustomerPortal,
  };
}

"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { subscribeToAuthChanges, isAdmin } from "../firebase/authUtils";
import { synchronizeSubscriptionCookie } from "../utils/cookieSynchronizer";

// Auth context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
  loggedIn: boolean;
  error: Error | null;
  isAdmin: boolean;
};

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loggedIn: false,
  error: null,
  isAdmin: false,
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [adminStatus, setAdminStatus] = useState(false);

  // Set up auth state listener using our new central service
  useEffect(() => {
    try {
      // Set up auth state listener
      const unsubscribe = subscribeToAuthChanges(async (user) => {
        // Check if this is a different user than before
        const previousUserId = localStorage.getItem("userId");
        const isUserSwitch =
          previousUserId && user && previousUserId !== user.uid;

        if (isUserSwitch) {
          console.warn("User account switch detected:", {
            previous: previousUserId,
            current: user.uid,
          });
          // Clear all user-specific data to prevent conflicts
          localStorage.clear();
        }

        setUser(user);
        setAdminStatus(isAdmin(user?.email));

        // Store or clear user ID in localStorage for image defaults
        if (user) {
          localStorage.setItem("userId", user.uid);
          console.log("User ID stored in localStorage:", user.uid);

          // Synchronize subscription cookies with auth claims
          try {
            // Get the latest ID token result to access custom claims
            const idTokenResult = await user.getIdTokenResult(true);

            // Synchronize the subscription cookie with the claims
            synchronizeSubscriptionCookie(idTokenResult.claims);
          } catch (error) {
            console.error("Error synchronizing cookies:", error);
          }
        } else {
          // Clear userId from localStorage on logout
          localStorage.removeItem("userId");
          localStorage.removeItem("subscription_status");
          console.log("User data cleared from localStorage");
        }

        setLoading(false);
      });

      // Set a timeout to prevent infinite loading states
      const timer = setTimeout(() => {
        if (loading) {
          setLoading(false);
        }
      }, 5000);

      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to initialize auth");
      setError(error);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loggedIn: !!user,
        error,
        isAdmin: adminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export context for direct use if needed
export { AuthContext };

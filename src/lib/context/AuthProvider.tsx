"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, initFirebase } from "../firebase/firebase";
import { toast } from "react-hot-toast";

// Auth context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
  loggedIn: boolean;
  isDevelopment: boolean;
  error: Error | null;
};

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loggedIn: false,
  isDevelopment: false,
  error: null,
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authInitAttempts, setAuthInitAttempts] = useState(0);

  useEffect(() => {
    // Check if we're in development mode
    const isDevEnvironment =
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    setIsDevelopment(isDevEnvironment);
    console.log(
      "Environment:",
      isDevEnvironment ? "development" : "production"
    );

    try {
      // Initialize Firebase if needed
      const { app, auth: authInstance } = initFirebase();

      if (!app || !authInstance) {
        console.warn("Firebase not properly initialized in AuthProvider");
        setAuthInitAttempts((prev) => prev + 1);

        if (isDevEnvironment) {
          // In development, we can proceed without Firebase
          console.log("In development mode, continuing without Firebase");
          setLoading(false);
          return;
        }

        // In production, try again for up to 3 attempts, then show an error
        if (authInitAttempts >= 3) {
          throw new Error(
            "Firebase failed to initialize after multiple attempts"
          );
        }

        // Try again in 2 seconds
        const retryTimer = setTimeout(() => {
          console.log(
            `Retrying Firebase initialization (attempt ${authInitAttempts + 1})`
          );
          setLoading(true);
        }, 2000);

        return () => clearTimeout(retryTimer);
      }

      console.log("Setting up auth state listener");
      const unsubscribe = onAuthStateChanged(
        authInstance,
        (user) => {
          setUser(user);
          setLoggedIn(!!user);
          setLoading(false);
          setError(null);

          if (user) {
            console.log(`User authenticated: ${user.email} (${user.uid})`);
          } else {
            console.log("No authenticated user");
          }
        },
        (authError) => {
          console.error("Auth state change error:", authError);
          setError(authError as Error);
          setLoading(false);
          setLoggedIn(false);

          if (typeof window !== "undefined") {
            toast.error("Authentication error: " + authError.message);
          }
        }
      );

      return () => {
        console.log("Cleaning up auth state listener");
        unsubscribe();
      };
    } catch (err) {
      console.error("Error in AuthProvider:", err);
      setError(err as Error);
      setLoading(false);

      if (typeof window !== "undefined") {
        toast.error("Authentication initialization error");
      }
    }
  }, [authInitAttempts]);

  const contextValue = {
    user,
    loading,
    loggedIn,
    isDevelopment,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Export context for direct use if needed
export { AuthContext };

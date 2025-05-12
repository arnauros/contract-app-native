"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
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

  // IMPORTANT: Add a timeout to stop loading after 5 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("AuthProvider: Force stopping loading after timeout");
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Check if we're in development mode
    const isDevEnvironment =
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    setIsDevelopment(isDevEnvironment);

    // Initialize Firebase (simplified)
    try {
      // Initialize Firebase
      initFirebase();

      if (!auth) {
        console.warn("Firebase auth not initialized");
        setLoading(false);
        return;
      }

      // Set up auth state listener
      console.log("Setting up auth state listener");
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          console.log("Auth state changed:", !!user);
          setUser(user);
          setLoggedIn(!!user);
          setLoading(false);
        },
        (error) => {
          console.error("Auth error:", error);
          setError(error as Error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error("Auth initialization error:", err);
      setError(err as Error);
      setLoading(false);
      toast.error("Authentication system failed to initialize");
    }
  }, []);

  // Debug output
  useEffect(() => {
    console.log("AuthProvider state:", {
      user: !!user,
      loading,
      loggedIn,
    });
  }, [user, loading, loggedIn]);

  return (
    <AuthContext.Provider
      value={{ user, loading, loggedIn, isDevelopment, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export context for direct use if needed
export { AuthContext };

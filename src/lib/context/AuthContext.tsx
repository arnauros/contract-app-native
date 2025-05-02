"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "../firebase/config";
import { toast } from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDevelopment: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDevelopment: false,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    // Check if we're in development mode
    const checkDevMode = () => {
      // Debug logging
      console.log("Current hostname:", window.location.hostname);
      console.log("NODE_ENV:", process.env.NODE_ENV);

      const isDevEnvironment =
        process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      setIsDevelopment(isDevEnvironment);
      console.log(
        "Environment mode:",
        isDevEnvironment ? "development" : "production"
      );
      return isDevEnvironment;
    };

    try {
      const isDevMode = checkDevMode();

      if (!app) {
        console.warn("Firebase app not initialized in AuthContext");
        if (isDevMode) {
          setLoading(false);
          return;
        }
        throw new Error("Firebase app not initialized");
      }

      const auth = getAuth(app);

      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setUser(user);
          setLoading(false);
          setError(null);
        },
        (authError) => {
          console.error("Auth state change error:", authError);
          setError(authError as Error);
          setLoading(false);
          toast.error("Authentication error: " + authError.message);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error in AuthProvider:", err);
      setError(err as Error);
      setLoading(false);
      if (typeof window !== "undefined") {
        toast.error("Authentication initialization error");
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isDevelopment, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

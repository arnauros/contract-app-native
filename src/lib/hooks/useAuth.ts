"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthProvider";
import { User } from "firebase/auth";

// Custom hook for auth data
export function useAuth() {
  const authContext = useContext(AuthContext);
  const [stableLoggedIn, setStableLoggedIn] = useState(
    !authContext.loading && !!authContext.user
  );

  // Ensure stable logged-in state to prevent UI flickers
  useEffect(() => {
    if (!authContext.loading) {
      setStableLoggedIn(!!authContext.user);
    }
  }, [authContext.loading, authContext.user]);

  return {
    user: authContext.user,
    loading: authContext.loading,
    error: authContext.error,
    isDevelopment: authContext.isDevelopment,
    // Use the stable logged-in state to prevent flickering
    loggedIn: stableLoggedIn,
  };
}

// Type guard to check if user is authenticated
export function isAuthenticated(user: User | null): user is User {
  return user !== null;
}

// Export default for simpler imports
export default useAuth;

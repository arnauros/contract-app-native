"use client";

import { useContext } from "react";
import { AuthContext } from "../context/AuthProvider";
import { User } from "firebase/auth";

// Simplified useAuth hook - direct pass-through to context values
export function useAuth() {
  const authContext = useContext(AuthContext);

  return {
    user: authContext.user,
    loading: authContext.loading,
    error: authContext.error,
    loggedIn: authContext.loggedIn,
    isAdmin: authContext.isAdmin,
  };
}

// Type guard to check if user is authenticated
export function isAuthenticated(user: User | null): user is User {
  return user !== null;
}

// Export default for simpler imports
export default useAuth;

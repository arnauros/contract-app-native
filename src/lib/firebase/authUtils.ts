"use client";

import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  getAuth,
  AuthError,
  signInAnonymously,
  User,
} from "firebase/auth";

// Common function to check if Firebase Auth is properly initialized
const checkAuthInitialized = () => {
  if (!auth) {
    console.error(
      "Auth instance not initialized - will try to get current auth"
    );
    try {
      // Try to get the current auth instance as fallback
      const currentAuth = getAuth();
      if (currentAuth) {
        console.log("Retrieved current auth instance as fallback");
        return currentAuth;
      }
      throw new Error("Auth instance not initialized and fallback failed");
    } catch (err) {
      console.error("Could not get fallback auth instance:", err);
      throw new Error("Authentication service is unavailable");
    }
  }
  return auth;
};

// Improved error handling for auth errors
const handleAuthError = (error: AuthError | Error) => {
  // Add debug information
  console.error("Auth error:", error);

  // Check if it's an AuthError with code
  if ("code" in error) {
    // Provide more user-friendly error messages
    let message = error.message;

    switch (error.code) {
      case "auth/invalid-credential":
        message =
          "Invalid email or password. Please check your credentials and try again.";
        break;
      case "auth/user-not-found":
        message =
          "No account found with this email. Please check your email or sign up.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password. Please try again.";
        break;
      case "auth/email-already-in-use":
        message =
          "This email is already registered. Please log in or use a different email.";
        break;
      case "auth/network-request-failed":
        message = "Network error. Please check your internet connection.";
        break;
      case "auth/too-many-requests":
        message = "Too many failed login attempts. Please try again later.";
        break;
    }

    return {
      error: {
        code: error.code,
        message: message,
      },
    };
  }

  // Generic error handling
  return {
    error: {
      code: "auth/unknown-error",
      message: error.message,
    },
  };
};

export const signIn = async (email: string, password: string) => {
  console.log(`Attempting to sign in with email: ${email}`);

  try {
    const authInstance = checkAuthInitialized();
    console.log("Auth instance validated, proceeding with sign in");

    const result = await signInWithEmailAndPassword(
      authInstance,
      email,
      password
    );
    console.log(`Sign in successful for user: ${result.user.email}`);
    return { user: result.user, error: null };
  } catch (error) {
    console.log(`Sign in failed: ${(error as Error).message}`);
    return handleAuthError(error as AuthError);
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const authInstance = checkAuthInitialized();
    const result = await createUserWithEmailAndPassword(
      authInstance,
      email,
      password
    );
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const signOut = async () => {
  try {
    const authInstance = checkAuthInitialized();
    await firebaseSignOut(authInstance);
    return { success: true, error: null };
  } catch (error) {
    return handleAuthError(error as Error);
  }
};

export const signInWithGoogle = async () => {
  try {
    const authInstance = checkAuthInitialized();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const updateUserProfile = async (displayName: string) => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return { error: { code: "auth/no-user", message: "No user logged in" } };
    }
    await updateProfile(auth.currentUser, { displayName });
    return { success: true, error: null };
  } catch (error) {
    return handleAuthError(error as Error);
  }
};

export const signInAnonymous = async () => {
  try {
    const authInstance = checkAuthInitialized();
    const result = await signInAnonymously(authInstance);
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

// Function to help with debugging
export const checkAuthStatus = async () => {
  try {
    const authInstance = checkAuthInitialized();
    const currentUser = authInstance.currentUser;

    return {
      isInitialized: !!authInstance,
      isAuthenticated: !!currentUser,
      user: currentUser,
      authProviders: authInstance.app.options,
    };
  } catch (error) {
    console.error("Error checking auth status:", error);
    return {
      isInitialized: false,
      isAuthenticated: false,
      error: (error as Error).message,
    };
  }
};

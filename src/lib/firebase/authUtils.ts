"use client";

import { auth, initFirebase } from "./firebase";
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
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import { errorHandler } from "@/lib/utils";

// Get auth instance or throw error
const getAuthInstance = () => {
  console.log("🔐 getAuthInstance: Getting auth instance", { hasAuth: !!auth });
  if (!auth) {
    console.log("🔐 getAuthInstance: No auth instance, initializing Firebase");
    const { auth: newAuth } = initFirebase();
    if (!newAuth) {
      console.error(
        "🔐 getAuthInstance: Failed to get auth instance after initialization"
      );
      throw new Error("Authentication service is unavailable");
    }
    console.log("🔐 getAuthInstance: Auth instance obtained from initFirebase");
    return newAuth;
  }
  console.log("🔐 getAuthInstance: Using existing auth instance");
  return auth;
};

export const signIn = async (email: string, password: string) => {
  try {
    const authInstance = getAuthInstance();

    // Clear any existing session data before signing in
    if (typeof window !== "undefined") {
      const oldUserId = localStorage.getItem("userId");
      if (oldUserId) {
        console.log("Clearing existing session data before sign in");
        localStorage.clear();
      }
    }

    const result = await signInWithEmailAndPassword(
      authInstance,
      email,
      password
    );

    // Create session automatically after login
    await createSession(result.user);

    return { user: result.user, error: null };
  } catch (error: any) {
    // Enhanced error handling with user-friendly messages
    let userMessage = "An error occurred during sign in. Please try again.";

    if (error.code === "auth/user-not-found") {
      userMessage =
        "No account found with this email address. Please check your email or sign up for a new account.";
    } else if (error.code === "auth/wrong-password") {
      userMessage =
        "Incorrect password. Please try again or reset your password.";
    } else if (error.code === "auth/invalid-email") {
      userMessage = "Please enter a valid email address.";
    } else if (error.code === "auth/user-disabled") {
      userMessage = "This account has been disabled. Please contact support.";
    } else if (error.code === "auth/too-many-requests") {
      userMessage =
        "Too many failed attempts. Please try again later or reset your password.";
    } else if (error.code === "auth/network-request-failed") {
      userMessage =
        "Network error. Please check your connection and try again.";
    }

    const appError = {
      code: error.code || "auth/unknown-error",
      message: userMessage,
      originalError: error,
    };

    errorHandler.handle(appError, "signIn");
    return { user: null, error: appError };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const authInstance = getAuthInstance();

    // Clear any existing session data before signing up
    if (typeof window !== "undefined") {
      console.log("Clearing existing session data before sign up");
      localStorage.clear();
    }

    const result = await createUserWithEmailAndPassword(
      authInstance,
      email,
      password
    );

    // Send email verification
    try {
      await sendEmailVerification(result.user);
      console.log("Email verification sent to:", result.user.email);
    } catch (verificationError) {
      console.warn("Failed to send email verification:", verificationError);
      // Don't fail the signup if email verification fails
    }

    // Create session automatically after signup
    await createSession(result.user);

    return { user: result.user, error: null };
  } catch (error: any) {
    // Enhanced error handling with user-friendly messages
    let userMessage = "An error occurred during sign up. Please try again.";

    if (error.code === "auth/email-already-in-use") {
      userMessage =
        "An account with this email already exists. Please sign in instead.";
    } else if (error.code === "auth/invalid-email") {
      userMessage = "Please enter a valid email address.";
    } else if (error.code === "auth/weak-password") {
      userMessage =
        "Password is too weak. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.";
    } else if (error.code === "auth/operation-not-allowed") {
      userMessage =
        "Email/password accounts are not enabled. Please contact support.";
    } else if (error.code === "auth/network-request-failed") {
      userMessage =
        "Network error. Please check your connection and try again.";
    }

    const appError = {
      code: error.code || "auth/unknown-error",
      message: userMessage,
      originalError: error,
    };

    errorHandler.handle(appError, "signUp");
    return { user: null, error: appError };
  }
};

// Create session cookie on the server
export const createSession = async (user: User) => {
  try {
    // Force refresh the token to ensure it's current
    const idToken = await user.getIdToken(true);

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: idToken }),
      credentials: "include", // Ensure cookies are included
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Session creation failed: ${errorData.error || "Unknown error"}`
      );
    }

    const data = await response.json();
    console.log("Session created for user:", data.userId);

    // Update localStorage with the correct userId
    if (typeof window !== "undefined") {
      localStorage.setItem("userId", user.uid);
    }

    return { success: true, error: null };
  } catch (error) {
    errorHandler.handle(error, "createSession");
    return { success: false, error };
  }
};

export const signOut = async () => {
  try {
    const authInstance = getAuthInstance();

    console.log("Starting sign out process...");

    // Clear localStorage first
    if (typeof window !== "undefined") {
      localStorage.removeItem("userId");
      localStorage.removeItem("subscription_status");
      console.log("Cleared localStorage");
    }

    // Remove the session cookie from server
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include", // Ensure cookies are included
    });
    console.log("Session cookie deletion requested");

    // Sign out from Firebase
    await firebaseSignOut(authInstance);
    console.log("Firebase sign out complete");

    // Force reload to clear any cached state
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }

    return { success: true, error: null };
  } catch (error) {
    errorHandler.handle(error, "signOut");
    return { success: false, error };
  }
};

export const signInWithGoogle = async () => {
  try {
    const authInstance = getAuthInstance();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);

    // Create session automatically after Google login
    await createSession(result.user);

    return { user: result.user, error: null };
  } catch (error) {
    const appError = errorHandler.parseFirebaseError(error);
    errorHandler.handle(appError, "signInWithGoogle");
    return { user: null, error: appError };
  }
};

export const updateUserProfile = async (
  displayName: string,
  photoURL?: string
) => {
  try {
    const authInstance = getAuthInstance();
    if (!authInstance.currentUser) {
      throw new Error("No user logged in");
    }

    const profileUpdates: { displayName: string; photoURL?: string } = {
      displayName,
    };

    // Only include photoURL if provided
    if (photoURL) {
      profileUpdates.photoURL = photoURL;
    }

    await updateProfile(authInstance.currentUser, profileUpdates);
    return { success: true, error: null };
  } catch (error) {
    errorHandler.handle(error, "updateUserProfile");
    return { success: false, error };
  }
};

export const signInAnonymous = async () => {
  try {
    const authInstance = getAuthInstance();
    const result = await signInAnonymously(authInstance);

    // Create session for anonymous users too
    await createSession(result.user);

    return { user: result.user, error: null };
  } catch (error) {
    const appError = errorHandler.parseFirebaseError(error);
    errorHandler.handle(appError, "signInAnonymous");
    return { user: null, error: appError };
  }
};

// Set up auth listener for use with hooks
export const subscribeToAuthChanges = (
  callback: (user: User | null) => void
) => {
  console.log("🔐 subscribeToAuthChanges: Setting up auth listener");
  const authInstance = getAuthInstance();
  console.log("🔐 subscribeToAuthChanges: Auth instance obtained", {
    hasAuth: !!authInstance,
  });
  return onAuthStateChanged(authInstance, (user) => {
    console.log("🔐 subscribeToAuthChanges: Firebase auth state changed", {
      user: user ? { uid: user.uid, email: user.email } : null,
    });
    callback(user);
  });
};

// Check if a user has admin role (put this in one place)
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;

  // Update the admin emails list to only include authorized admin emails
  const ADMIN_EMAILS = ["arnauros22@gmail.com", "admin@example.com"];

  // Make sure hello@arnau.design is not treated as admin
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Send email verification
export const sendVerificationEmail = async (user: User) => {
  try {
    await sendEmailVerification(user);
    return { success: true, error: null };
  } catch (error: any) {
    const appError = {
      code: error.code || "auth/unknown-error",
      message: "Failed to send verification email. Please try again.",
      originalError: error,
    };
    errorHandler.handle(appError, "sendVerificationEmail");
    return { success: false, error: appError };
  }
};

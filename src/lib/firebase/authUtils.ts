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
} from "firebase/auth";
import { errorHandler } from "@/lib/utils";

// Get auth instance or throw error
const getAuthInstance = () => {
  if (!auth) {
    const { auth: newAuth } = initFirebase();
    if (!newAuth) {
      throw new Error("Authentication service is unavailable");
    }
    return newAuth;
  }
  return auth;
};

export const signIn = async (email: string, password: string) => {
  try {
    const authInstance = getAuthInstance();
    const result = await signInWithEmailAndPassword(
      authInstance,
      email,
      password
    );

    // Create session automatically after login
    await createSession(result.user);

    return { user: result.user, error: null };
  } catch (error) {
    const appError = errorHandler.parseFirebaseError(error);
    errorHandler.handle(appError, "signIn");
    return { user: null, error: appError };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const authInstance = getAuthInstance();
    const result = await createUserWithEmailAndPassword(
      authInstance,
      email,
      password
    );

    // Create session automatically after signup
    await createSession(result.user);

    return { user: result.user, error: null };
  } catch (error) {
    const appError = errorHandler.parseFirebaseError(error);
    errorHandler.handle(appError, "signUp");
    return { user: null, error: appError };
  }
};

// Create session cookie on the server
export const createSession = async (user: User) => {
  try {
    const idToken = await user.getIdToken();

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Session creation failed: ${errorData.error || "Unknown error"}`
      );
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

    // First remove the session cookie
    await fetch("/api/auth/session", {
      method: "DELETE",
    });

    // Then sign out from Firebase
    await firebaseSignOut(authInstance);

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

export const updateUserProfile = async (displayName: string) => {
  try {
    const authInstance = getAuthInstance();
    if (!authInstance.currentUser) {
      throw new Error("No user logged in");
    }
    await updateProfile(authInstance.currentUser, { displayName });
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
  const authInstance = getAuthInstance();
  return onAuthStateChanged(authInstance, callback);
};

// Check if a user has admin role (put this in one place)
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;

  const ADMIN_EMAILS = ["arnauros22@gmail.com", "admin@example.com"];

  return ADMIN_EMAILS.includes(email);
};

"use client";

import { User, IdTokenResult } from "firebase/auth";

// Mock user for development mode
const MOCK_USER: User = {
  uid: "dev-user-123",
  email: "dev@example.com",
  displayName: "Development User",
  emailVerified: true,
  phoneNumber: null,
  photoURL: null,
  providerId: "firebase",
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  refreshToken: "mock-refresh-token",
  tenantId: null,
  delete: async () => Promise.resolve(),
  getIdToken: async () => "mock-id-token",
  getIdTokenResult: async () =>
    ({
      token: "mock-id-token",
      signInProvider: "password",
      signInSecondFactor: null,
      claims: {},
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      authTime: new Date().toISOString(),
    } as IdTokenResult),
  reload: async () => Promise.resolve(),
  toJSON: () => ({ uid: "dev-user-123", email: "dev@example.com" }),
};

/**
 * Development mode authentication service
 * Only use in development to bypass Firebase auth issues
 */
export class DevAuth {
  private static instance: DevAuth;
  private authStateListeners: Array<(user: User | null) => void> = [];
  private user: User | null = null;
  private persistedUser: string | null = null;

  constructor() {
    // Load persisted user from localStorage if available
    if (typeof window !== "undefined") {
      this.persistedUser = localStorage.getItem("dev-auth-user");
      if (this.persistedUser) {
        try {
          // Reinstate mock user
          this.user = MOCK_USER;
          console.log("Dev auth: Restored user from local storage");
        } catch (error) {
          console.error("Dev auth: Error parsing persisted user", error);
          localStorage.removeItem("dev-auth-user");
        }
      }
    }
  }

  static getInstance(): DevAuth {
    if (!DevAuth.instance) {
      DevAuth.instance = new DevAuth();
    }
    return DevAuth.instance;
  }

  /**
   * Sign in with email and password (mock implementation)
   */
  async signInWithEmailAndPassword(email: string, password: string) {
    console.log("Dev auth: Sign in attempt", { email });

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Set mock user
    this.user = {
      ...MOCK_USER,
      email: email,
      displayName: email.split("@")[0],
    };

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("dev-auth-user", email);
    }

    // Notify listeners
    this.notifyListeners();

    return { user: this.user };
  }

  /**
   * Sign out (mock implementation)
   */
  async signOut() {
    console.log("Dev auth: Sign out");

    // Clear user
    this.user = null;

    // Remove from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("dev-auth-user");
    }

    // Notify listeners
    this.notifyListeners();

    return { success: true };
  }

  /**
   * Add auth state changed listener (mock implementation)
   */
  onAuthStateChanged(callback: (user: User | null) => void) {
    this.authStateListeners.push(callback);

    // Immediately invoke with current state
    callback(this.user);

    // Return function to remove listener
    return () => {
      this.authStateListeners = this.authStateListeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  /**
   * Notify all auth state listeners
   */
  private notifyListeners() {
    this.authStateListeners.forEach((listener) => listener(this.user));
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if user is signed in
   */
  isSignedIn() {
    return !!this.user;
  }
}

// Export singleton instance
export const devAuth = DevAuth.getInstance();

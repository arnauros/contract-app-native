import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a date string using date-fns
export function formatDate(date: string | Date, formatString: string = "PPP") {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatString);
}

// Animation variants for framer-motion
export const fadeIn = (
  direction: "up" | "down" | "left" | "right" = "up",
  delay: number = 0.2
) => {
  return {
    hidden: {
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
      opacity: 0,
    },
    show: {
      y: 0,
      x: 0,
      opacity: 1,
      transition: {
        type: "tween",
        duration: 0.8,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    },
  };
};

// Staggered animation for lists
export const staggerContainer = (
  staggerChildren?: number,
  delayChildren?: number
) => {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
};

// Centralized environment configuration
export const env = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",

  // Application URLs
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "",

  // Feature flags
  enableDebugLogging: process.env.NODE_ENV === "development",
};

// Browser-only utility to get domain information
export const getDomainInfo = () => {
  if (typeof window === "undefined") {
    return {
      isLocalhost: false,
      hostname: "",
      port: "",
      protocol: "",
      baseUrl: "",
    };
  }

  const { hostname, port, protocol } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

  return {
    isLocalhost,
    hostname,
    port,
    protocol,
    baseUrl,
  };
};

// Helper to check if we're in a local development environment
export const isLocalDevelopment = () => {
  if (typeof window === "undefined") return env.isDevelopment;
  return env.isDevelopment && getDomainInfo().isLocalhost;
};

// Helper to create a full URL with the current domain
export const createUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window === "undefined") {
    return env.appUrl + normalizedPath;
  }

  return getDomainInfo().baseUrl + normalizedPath;
};

// Standard error types for the application
export enum ErrorType {
  AUTH = "auth",
  SUBSCRIPTION = "subscription",
  API = "api",
  NETWORK = "network",
  DATABASE = "database",
  VALIDATION = "validation",
  UNKNOWN = "unknown",
}

// Standard error interface
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error | unknown;
  code?: string;
}

// Centralized error handling
export const errorHandler = {
  // Log an error to the console
  log: (error: AppError | Error | unknown, context?: string) => {
    if (env.enableDebugLogging) {
      console.error(
        `[Error${context ? ` - ${context}` : ""}]`,
        error instanceof Error ? error.message : error
      );

      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
    }
  },

  // Show an error toast to the user
  notify: (error: AppError | Error | unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
          error &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "An unexpected error occurred";

    toast.error(message);
    return message;
  },

  // Handle an error (log it and notify user)
  handle: (error: Error | unknown, context?: string): AppError => {
    // Convert to standard AppError format
    const appError: AppError =
      error instanceof Error
        ? {
            type: ErrorType.UNKNOWN,
            message: error.message,
            originalError: error,
          }
        : {
            type: ErrorType.UNKNOWN,
            message: "An unexpected error occurred",
            originalError: error,
          };

    // Log the error
    errorHandler.log(appError, context);

    // Notify the user (if in browser)
    if (typeof window !== "undefined") {
      errorHandler.notify(appError);
    }

    return appError;
  },

  // Parse Firebase error codes to user-friendly messages
  parseFirebaseError: (error: any): AppError => {
    let message = "An authentication error occurred";
    let type = ErrorType.AUTH;
    let code = "";

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
    ) {
      code = error.code;

      // Parse common Firebase error codes
      if (error.code.startsWith("auth/")) {
        type = ErrorType.AUTH;

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
            type = ErrorType.NETWORK;
            break;
          case "auth/too-many-requests":
            message = "Too many failed login attempts. Please try again later.";
            break;
          default:
            message = error.message || "Authentication error";
        }
      } else if (error.code.startsWith("firestore/")) {
        type = ErrorType.DATABASE;
        message = error.message || "Database error";
      } else if (error.code.startsWith("storage/")) {
        type = ErrorType.DATABASE;
        message = error.message || "Storage error";
      } else if (error.code.startsWith("functions/")) {
        type = ErrorType.API;
        message = error.message || "API error";
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      type,
      message,
      code,
      originalError: error,
    };
  },
};

// Add conditional logging to prevent duplicate logs in development
export const logDebug = (...args: any[]) => {
  // Skip in production
  if (process.env.NODE_ENV === "production") return;

  // Use a timestamp-based deduplication to avoid double logs in React StrictMode
  const logKey = JSON.stringify(args);

  // Use global object for cache storage
  if (typeof window !== "undefined") {
    if (!window._logCache) {
      window._logCache = {};
    }

    const now = Date.now();
    if (!window._logCache[logKey] || now - window._logCache[logKey] > 1000) {
      window._logCache[logKey] = now;
      console.log(...args);
    }
  } else {
    // In server environment, just log normally
    console.log(...args);
  }
};

// Extend Window interface to include our cache
declare global {
  interface Window {
    _logCache?: Record<string, number>;
    _toastCache?: Record<string, number>;
  }
}

// Deduplicated toast function to prevent double toasts in StrictMode
export const showToast = {
  success: (message: string) => {
    if (typeof window === "undefined") {
      return toast.success(message);
    }

    // Initialize toast cache if needed
    if (!window._toastCache) {
      window._toastCache = {};
    }

    const now = Date.now();
    const cacheKey = `success-${message}`;

    // Only show toast if not shown in the last second
    if (
      !window._toastCache[cacheKey] ||
      now - window._toastCache[cacheKey] > 1000
    ) {
      window._toastCache[cacheKey] = now;
      return toast.success(message);
    }
  },

  error: (message: string) => {
    if (typeof window === "undefined") {
      return toast.error(message);
    }

    // Initialize toast cache if needed
    if (!window._toastCache) {
      window._toastCache = {};
    }

    const now = Date.now();
    const cacheKey = `error-${message}`;

    // Only show toast if not shown in the last second
    if (
      !window._toastCache[cacheKey] ||
      now - window._toastCache[cacheKey] > 1000
    ) {
      window._toastCache[cacheKey] = now;
      return toast.error(message);
    }
  },

  // Add more methods for other toast types if needed
  info: (message: string) => {
    if (typeof window === "undefined") {
      return toast.success(message);
    }

    if (!window._toastCache) {
      window._toastCache = {};
    }

    const now = Date.now();
    const cacheKey = `info-${message}`;

    if (
      !window._toastCache[cacheKey] ||
      now - window._toastCache[cacheKey] > 1000
    ) {
      window._toastCache[cacheKey] = now;
      return toast(message);
    }
  },
};

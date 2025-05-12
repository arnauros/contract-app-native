"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/app/(dashboard)/topbar";
import Sidebar from "@/app/(dashboard)/sidebar";
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { FirebaseError } from "firebase/app";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isViewRoute = pathname?.startsWith("/view/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isLandingPage =
    pathname === "/" || pathname === "/pricing" || pathname === "/about";

  // Add global error handling
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Special handling for Firebase errors
      if (event.reason instanceof FirebaseError) {
        const fbError = event.reason as FirebaseError;
        console.error("Firebase error code:", fbError.code);

        if (fbError.code === "permission-denied") {
          toast.error(
            "Firebase permissions error. Please check your authentication."
          );
        } else {
          toast.error(`Firebase error: ${fbError.message}`);
        }
      } else {
        // Show a generic toast notification for other errors
        toast.error("Something went wrong");
      }

      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);

      // Show a toast notification for the error
      toast.error("An error occurred");

      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Add event listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    // Clean up event listeners
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  // For view routes and landing page, return children directly without layout
  if (isViewRoute || isLandingPage) {
    return children;
  }

  return (
    <div className="flex min-h-screen">
      {!isAuthRoute && (
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {!isAuthRoute && <Topbar pathname={pathname || ""} />}
        <main className="flex-1 pt-14">{children}</main>
      </div>
    </div>
  );
}

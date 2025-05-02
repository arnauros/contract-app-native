"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/app/Components/topbar";
import Sidebar from "@/app/Components/sidebar";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isViewRoute = pathname?.startsWith("/view/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  // Add global error handling
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Show a toast notification for the error
      toast.error("Something went wrong");

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

  if (isViewRoute) {
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

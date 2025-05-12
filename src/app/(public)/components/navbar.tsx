"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { signOut } from "@/lib/firebase/authUtils";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { loggedIn } = useAuth();
  const { isActive, subscriptions, loading: subLoading } = useSubscription();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if user is on a pro plan based on subscriptions
  const isPro = subscriptions.some(
    (sub) =>
      sub.items &&
      sub.items.some((item: any) =>
        item.price?.nickname?.toLowerCase().includes("pro")
      )
  );

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      // No need to redirect as Firebase auth listener will handle this
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="font-bold text-xl text-gray-900 transition-colors duration-200 hover:text-orange-500"
              >
                Your App
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                  pathname === "/"
                    ? "border-orange-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-orange-300 hover:text-gray-700"
                }`}
              >
                Home
              </Link>
              <Link
                href="/pricing"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                  pathname === "/pricing"
                    ? "border-orange-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-orange-300 hover:text-gray-700"
                }`}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                  pathname === "/about"
                    ? "border-orange-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-orange-300 hover:text-gray-700"
                }`}
              >
                About
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {loggedIn && (
              <div className="mr-4 px-2 py-1 text-xs font-medium rounded-full border border-gray-300 bg-gray-50">
                {subLoading ? (
                  <span>Loading...</span>
                ) : isPro ? (
                  <span className="text-green-600">
                    Pro Plan {isActive ? "(Active)" : "(Inactive)"}
                  </span>
                ) : (
                  <span className="text-gray-600">
                    Free Plan {isActive ? "(Active)" : "(Inactive)"}
                  </span>
                )}
              </div>
            )}
            <div className="flex space-x-4">
              {loggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-b from-orange-400 to-orange-500 text-white border-b-[1.5px] border-orange-700 shadow-[0_0_0_2px_rgba(0,0,0,0.04),0_0_14px_0_rgba(255,255,255,0.19)] transition-all duration-300 hover:shadow-orange-300 hover:translate-y-[-1px]"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-3 py-2 rounded-md text-sm font-medium border border-orange-200 bg-transparent text-orange-600 transition-all duration-200 hover:bg-orange-50 hover:border-orange-300"
                  >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium text-orange-600 transition-all duration-200 hover:bg-orange-50 hover:text-orange-700"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-b from-orange-400 to-orange-500 text-white border-b-[1.5px] border-orange-700 shadow-[0_0_0_2px_rgba(0,0,0,0.04),0_0_14px_0_rgba(255,255,255,0.19)] transition-all duration-300 hover:shadow-orange-300 hover:translate-y-[-1px]"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

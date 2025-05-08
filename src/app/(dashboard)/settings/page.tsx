"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { updateUserProfile, signOut } from "@/lib/firebase/auth";
import { FiUser, FiCreditCard, FiSettings, FiLogOut } from "react-icons/fi";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("account");
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state from user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      const result = await updateUserProfile(displayName);
      if (result.error) {
        toast.error(result.error.message || "Failed to update profile");
        return;
      }
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Please log in to access settings.</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "account", label: "Account", icon: FiUser },
    { id: "subscription", label: "Subscription", icon: FiCreditCard },
    { id: "preferences", label: "Preferences", icon: FiSettings },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="md:w-1/4 border-r border-gray-200">
            <nav className="flex flex-col md:space-y-1 p-2 md:p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 mt-auto"
              >
                <FiLogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </nav>
          </div>

          {/* Content area */}
          <div className="md:w-3/4 p-4 md:p-6">
            {/* Account Tab */}
            {activeTab === "account" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Account Information
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your account details and preferences.
                </p>

                <div className="mt-6 space-y-6">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Your email is used for login and notifications.
                    </p>
                  </div>

                  {/* Display Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Display Name
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={!isEditing}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="flex items-center space-x-4">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleUpdateProfile}
                          disabled={isSubmitting}
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === "subscription" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Subscription
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your subscription and billing.
                </p>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-md font-medium text-blue-900">
                        Current Plan: Free
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        1.25 GB of 5 GB used (25%)
                      </p>
                    </div>
                    <button
                      onClick={() => router.push("/upgrade")}
                      className="mt-3 md:mt-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900">
                    Available Plans
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Free Plan */}
                    <div className="relative rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
                      <div className="flex flex-col h-full">
                        <h3 className="text-md font-medium text-gray-900">
                          Free
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Basic features for personal use
                        </p>
                        <div className="mt-4 flex items-baseline">
                          <span className="text-2xl font-bold tracking-tight text-gray-900">
                            $0
                          </span>
                          <span className="ml-1 text-sm font-medium text-gray-500">
                            /month
                          </span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-gray-500">
                          <li className="flex items-start">
                            <span className="flex-shrink-0">✓</span>
                            <span className="ml-2">5 GB Storage</span>
                          </li>
                          <li className="flex items-start">
                            <span className="flex-shrink-0">✓</span>
                            <span className="ml-2">Basic document editing</span>
                          </li>
                        </ul>
                        <div className="mt-6 flex-grow flex items-end">
                          <button
                            disabled
                            className="w-full rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm cursor-not-allowed opacity-60"
                          >
                            Current Plan
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
                      <div className="flex flex-col h-full">
                        <h3 className="text-md font-medium text-gray-900">
                          Pro
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Everything you need for your work
                        </p>
                        <div className="mt-4 flex items-baseline">
                          <span className="text-2xl font-bold tracking-tight text-gray-900">
                            $9.99
                          </span>
                          <span className="ml-1 text-sm font-medium text-gray-500">
                            /month
                          </span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-gray-500">
                          <li className="flex items-start">
                            <span className="flex-shrink-0">✓</span>
                            <span className="ml-2">50 GB Storage</span>
                          </li>
                          <li className="flex items-start">
                            <span className="flex-shrink-0">✓</span>
                            <span className="ml-2">
                              Advanced document editing
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="flex-shrink-0">✓</span>
                            <span className="ml-2">Priority support</span>
                          </li>
                        </ul>
                        <div className="mt-6 flex-grow flex items-end">
                          <button
                            onClick={() => router.push("/upgrade")}
                            className="w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Upgrade
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900">
                    Billing History
                  </h3>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      No recent transactions
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Preferences
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Customize your experience.
                </p>

                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900">
                    Notifications
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="email_notifications"
                          name="email_notifications"
                          type="checkbox"
                          defaultChecked={true}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label
                          htmlFor="email_notifications"
                          className="font-medium text-gray-700"
                        >
                          Email notifications
                        </label>
                        <p className="text-gray-500">
                          Receive email notifications about your account and
                          documents.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="marketing_emails"
                          name="marketing_emails"
                          type="checkbox"
                          defaultChecked={false}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label
                          htmlFor="marketing_emails"
                          className="font-medium text-gray-700"
                        >
                          Marketing emails
                        </label>
                        <p className="text-gray-500">
                          Receive marketing emails about new features and
                          offers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-medium text-gray-900">Theme</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center">
                      <input
                        id="theme_light"
                        name="theme"
                        type="radio"
                        defaultChecked={true}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label
                        htmlFor="theme_light"
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        Light
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="theme_dark"
                        name="theme"
                        type="radio"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label
                        htmlFor="theme_dark"
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        Dark
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="theme_system"
                        name="theme"
                        type="radio"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label
                        htmlFor="theme_system"
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        System default
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

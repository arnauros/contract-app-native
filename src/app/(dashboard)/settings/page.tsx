"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { updateUserProfile, signOut } from "@/lib/firebase/authUtils";
import { FiUser, FiCreditCard, FiSettings, FiLogOut } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import DebugClaims from "@/app/Components/DebugClaims";

export default function SettingsPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("account");
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate saving
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p>Please login to view settings.</p>
      </div>
    );
  }

  const tabs = [
    { id: "account", label: "Account", icon: FiUser },
    { id: "subscription", label: "Subscription", icon: FiCreditCard },
    { id: "preferences", label: "Preferences", icon: FiSettings },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-gray-700 text-sm font-medium mb-2"
                  htmlFor="name"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  disabled
                  value={user.displayName || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label
                  className="block text-gray-700 text-sm font-medium mb-2"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  disabled
                  value={user.email || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Add Debug Claims component - only visible in development */}
          {process.env.NODE_ENV === "development" && <DebugClaims />}
        </div>

        <div>
          <SubscriptionStatus />
        </div>
      </div>
    </div>
  );
}

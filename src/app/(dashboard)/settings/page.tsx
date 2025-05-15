"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { updateUserProfile, signOut } from "@/lib/firebase/authUtils";
import {
  FiUser,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiTrash,
  FiCode,
  FiImage,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import DebugClaims from "@/app/Components/DebugClaims";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUser } from "firebase/auth";
import {
  doc,
  setDoc,
  getFirestore,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import ProfileImageUploader from "@/app/Components/ProfileImageUploader";

// New function to create a test stripe customer ID for development
const createTestStripeCustomer = async (userId: string) => {
  if (process.env.NODE_ENV !== "development") return;

  try {
    const db = getFirestore();
    // Add a mock stripeCustomerId to the user document
    await setDoc(
      doc(db, "users", userId),
      {
        stripeCustomerId: `mock_cus_${Math.random()
          .toString(36)
          .substring(2, 15)}`,
        // Don't overwrite other fields
      },
      { merge: true }
    );

    toast.success("Created test Stripe customer ID");
    // Reload the page to refresh subscription status
    window.location.reload();
  } catch (error) {
    console.error("Error creating test Stripe customer:", error);
    toast.error("Failed to create test customer");
  }
};

export default function SettingsPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const {
    isActive: isSubscriptionActive,
    loading: subscriptionLoading,
    openCustomerPortal,
    createCheckoutSession,
  } = useSubscription();

  const [activeTab, setActiveTab] = useState("account");
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Image state
  const [profileImageUrl, setProfileImageUrl] = useState<string>(
    "/placeholder-profile.png"
  );
  const [profileBannerUrl, setProfileBannerUrl] = useState<string>(
    "/placeholder-banner.png"
  );
  const [defaultProfileImageUrl, setDefaultProfileImageUrl] = useState<
    string | null
  >(null);
  const [defaultProfileBannerUrl, setDefaultProfileBannerUrl] = useState<
    string | null
  >(null);
  const [isSettingDefaultImage, setIsSettingDefaultImage] = useState(false);
  const [isSettingDefaultBanner, setIsSettingDefaultBanner] = useState(false);

  // Initialize form state from user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");

      // Try loading from localStorage first for immediate display
      const tryLocalImages = () => {
        const userId = user.uid;
        const profileImageKey = `profileImage-${userId}`;
        const profileBannerKey = `profileBanner-${userId}`;
        const defaultProfileImageKey = `defaultProfileImage-${userId}`;
        const defaultProfileBannerKey = `defaultProfileBanner-${userId}`;

        const savedProfileImage = localStorage.getItem(profileImageKey);
        const savedProfileBanner = localStorage.getItem(profileBannerKey);
        const savedDefaultProfileImage = localStorage.getItem(
          defaultProfileImageKey
        );
        const savedDefaultProfileBanner = localStorage.getItem(
          defaultProfileBannerKey
        );

        if (savedProfileImage) {
          setProfileImageUrl(savedProfileImage);
        } else if (user.photoURL) {
          // If no localStorage but Auth profile pic exists
          setProfileImageUrl(user.photoURL);
          // Save to localStorage
          localStorage.setItem(profileImageKey, user.photoURL);
        }

        if (savedProfileBanner) {
          setProfileBannerUrl(savedProfileBanner);
        }

        if (savedDefaultProfileImage) {
          setDefaultProfileImageUrl(savedDefaultProfileImage);
        }

        if (savedDefaultProfileBanner) {
          setDefaultProfileBannerUrl(savedDefaultProfileBanner);
        }
      };

      // Try localStorage first
      tryLocalImages();

      // Then get the latest data from Firestore
      const fetchUserData = async () => {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Set profile image and banner if available
            if (userData.profileImageUrl) {
              setProfileImageUrl(userData.profileImageUrl);
              localStorage.setItem(
                `profileImage-${user.uid}`,
                userData.profileImageUrl
              );
            }

            if (userData.profileBannerUrl) {
              setProfileBannerUrl(userData.profileBannerUrl);
              localStorage.setItem(
                `profileBanner-${user.uid}`,
                userData.profileBannerUrl
              );
            }

            // Get default images
            if (userData.defaultProfileImageUrl) {
              setDefaultProfileImageUrl(userData.defaultProfileImageUrl);
              localStorage.setItem(
                `defaultProfileImage-${user.uid}`,
                userData.defaultProfileImageUrl
              );
            }

            if (userData.defaultProfileBannerUrl) {
              setDefaultProfileBannerUrl(userData.defaultProfileBannerUrl);
              localStorage.setItem(
                `defaultProfileBanner-${user.uid}`,
                userData.defaultProfileBannerUrl
              );
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, [user]);

  // Ensure profile image and banner are loaded from localStorage if available
  useEffect(() => {
    if (user) {
      const userId = user.uid;
      const profileImageKey = `profileImage-${userId}`;
      const profileBannerKey = `profileBanner-${userId}`;

      const savedProfileImage = localStorage.getItem(profileImageKey);
      const savedProfileBanner = localStorage.getItem(profileBannerKey);

      if (savedProfileImage) {
        setProfileImageUrl(savedProfileImage);
      }

      if (savedProfileBanner) {
        setProfileBannerUrl(savedProfileBanner);
      }
    }
  }, [user]);

  // Function to set default profile image
  const setDefaultImage = async () => {
    if (!user) return;

    try {
      setIsSettingDefaultImage(true);
      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      // Check if we have a default image
      if (!defaultProfileImageUrl) {
        toast.error("No default profile image found. Please upload one first.");
        return;
      }

      // Update the user's profile image with the default
      await updateDoc(userRef, {
        profileImageUrl: defaultProfileImageUrl,
      });

      // Also update auth profile
      await updateUserProfile(displayName, defaultProfileImageUrl);

      // Update local state and localStorage
      setProfileImageUrl(defaultProfileImageUrl);
      localStorage.setItem(`profileImage-${user.uid}`, defaultProfileImageUrl);

      toast.success("Default profile image applied");
    } catch (error) {
      console.error("Error setting default image:", error);
      toast.error("Failed to set default image");
    } finally {
      setIsSettingDefaultImage(false);
    }
  };

  // Function to set default banner
  const setDefaultBanner = async () => {
    if (!user) return;

    try {
      setIsSettingDefaultBanner(true);
      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      // Check if we have a default banner
      if (!defaultProfileBannerUrl) {
        toast.error("No default banner found. Please upload one first.");
        return;
      }

      // Update the user's banner with the default
      await updateDoc(userRef, {
        profileBannerUrl: defaultProfileBannerUrl,
      });

      // Update local state and localStorage
      setProfileBannerUrl(defaultProfileBannerUrl);
      localStorage.setItem(
        `profileBanner-${user.uid}`,
        defaultProfileBannerUrl
      );

      toast.success("Default banner applied");
    } catch (error) {
      console.error("Error setting default banner:", error);
      toast.error("Failed to set default banner");
    } finally {
      setIsSettingDefaultBanner(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      const result = await updateUserProfile(displayName, profileImageUrl);
      if (result.error) {
        toast.error(
          result.error instanceof Error
            ? result.error.message
            : "Failed to update profile"
        );
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

  // Function to upgrade to yearly subscription
  const handleYearlyUpgrade = useCallback(async () => {
    try {
      if (!user) {
        toast.error("You must be logged in to upgrade");
        return;
      }

      const loadingToast = toast.loading("Preparing yearly subscription...");

      try {
        await createCheckoutSession("price_1ROwocEAkEk7AeWQVxTQJAJ7");
        // If successful, the user will be redirected
      } catch (error) {
        console.error("Error upgrading to yearly:", error);
        toast.error("Failed to upgrade subscription");
      } finally {
        if (loadingToast) {
          toast.dismiss(loadingToast);
        }
      }
    } catch (error) {
      console.error("Error in handleYearlyUpgrade:", error);
      toast.error("An unexpected error occurred");
    }
  }, [user, createCheckoutSession]);

  // Function to manage subscription
  const handleManageSubscription = useCallback(async () => {
    try {
      if (!user) {
        toast.error("You must be logged in to manage your subscription");
        return;
      }

      const loadingToast = toast.loading("Opening subscription portal...");

      try {
        await openCustomerPortal();
        // If successful, the user will be redirected
      } catch (error) {
        console.error("Error opening customer portal:", error);

        // Check for specific error messages
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Handle different error conditions based on the error message
        if (
          errorMessage.includes("No Stripe customer found") ||
          errorMessage.includes("User not found") ||
          errorMessage.includes("Database error")
        ) {
          toast.error("No active subscription found. Please subscribe first.");

          // If in development, help the developer understand the issue
          if (process.env.NODE_ENV === "development") {
            console.info(
              "Development hint: Check Firestore for a user document with stripeCustomerId field"
            );
          }
        } else {
          toast.error(
            "Failed to open subscription management portal. Try again later."
          );
        }
      } finally {
        if (loadingToast) {
          toast.dismiss(loadingToast);
        }
      }
    } catch (error) {
      console.error("Error in handleManageSubscription:", error);
      toast.error("An unexpected error occurred");
    }
  }, [user, openCustomerPortal]);

  // Function to delete account
  const handleDeleteAccount = useCallback(async () => {
    if (!user) {
      toast.error("No user account to delete");
      return;
    }

    if (deleteConfirmText !== user.email) {
      toast.error("Email confirmation doesn't match");
      return;
    }

    try {
      setDeletingAccount(true);

      // First, check if user has active subscription and warn them
      let shouldBlockDeletion = isSubscriptionActive;

      if (isSubscriptionActive) {
        try {
          // Cancel subscription first by opening portal
          const loadingToast = toast.loading("Checking subscription status...");
          try {
            await openCustomerPortal();
            // If successful, the user will be redirected to the portal
          } catch (error) {
            console.error("Error opening customer portal:", error);

            // Check for specific error messages
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            // Only show a warning if it's an actual error, not just missing customer data
            if (
              !errorMessage.includes("No Stripe customer found") &&
              !errorMessage.includes("User not found") &&
              !errorMessage.includes("Database error")
            ) {
              toast.error(
                "Failed to open subscription portal, but you can still delete your account"
              );
            }

            // Since there was an error with the subscription check,
            // we'll assume there's no active subscription to block deletion
            // This is a safer approach than blocking deletion because of API errors
            shouldBlockDeletion = false;
          } finally {
            if (loadingToast) {
              toast.dismiss(loadingToast);
            }
          }

          // We still warn them about active subscription if we know they have one
          if (shouldBlockDeletion) {
            toast.error(
              "Please cancel your subscription first before deleting your account"
            );
            setDeletingAccount(false);
            setDeleteDialogOpen(false);
            return;
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }

      // Delete user account
      await deleteUser(user);

      // Clear any session data
      await fetch("/api/auth/session", {
        method: "DELETE",
      });

      toast.success("Your account has been deleted");
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        "Failed to delete account. Try signing in again before deleting."
      );
      setDeletingAccount(false);
    }
  }, [
    user,
    deleteConfirmText,
    isSubscriptionActive,
    openCustomerPortal,
    router,
  ]);

  const handleProfileImageChange = (url: string) => {
    setProfileImageUrl(url);
    // Also save in localStorage for persistence
    if (user) {
      localStorage.setItem(`profileImage-${user.uid}`, url);
    }
  };

  const handleProfileBannerChange = (url: string) => {
    setProfileBannerUrl(url);
    // Also save in localStorage for persistence
    if (user) {
      localStorage.setItem(`profileBanner-${user.uid}`, url);
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
          {/* Profile Banner */}
          <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
            <div className="h-40 w-full relative">
              <ProfileImageUploader
                type="profileBanner"
                imageUrl={profileBannerUrl}
                onImageChange={handleProfileBannerChange}
                className="w-full"
              />
            </div>

            {/* Profile Image (overlapping with banner) */}
            <div className="px-6 pb-6 pt-12 relative">
              <div className="absolute -top-20 left-6">
                <ProfileImageUploader
                  type="profileImage"
                  imageUrl={profileImageUrl}
                  onImageChange={handleProfileImageChange}
                  className="w-full shadow-md border-4 border-white"
                />
              </div>
              <div className="ml-32">
                <h2 className="text-xl font-semibold">{user?.displayName}</h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Settings */}
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
                  value={user?.displayName || ""}
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
                  value={user?.email || ""}
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

          {/* Default Images Section */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-6">Default Images</h2>
            <p className="text-gray-600 mb-6">
              Set default profile image and banner that will be used when
              starting new contracts or sending to clients.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Default Profile Image
                </h3>
                <ProfileImageUploader
                  type="profileImage"
                  imageUrl={
                    defaultProfileImageUrl || "/placeholder-profile.png"
                  }
                  onImageChange={setDefaultProfileImageUrl}
                  isDefaultUpload={true}
                  className="mb-3"
                />
                <Button
                  onClick={setDefaultImage}
                  disabled={isSettingDefaultImage || !defaultProfileImageUrl}
                  className="mt-2 flex items-center"
                >
                  <FiImage className="mr-2" />
                  {isSettingDefaultImage
                    ? "Setting..."
                    : "Use as My Profile Image"}
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Default Banner</h3>
                <ProfileImageUploader
                  type="profileBanner"
                  imageUrl={
                    defaultProfileBannerUrl || "/placeholder-banner.png"
                  }
                  onImageChange={setDefaultProfileBannerUrl}
                  isDefaultUpload={true}
                  className="mb-3"
                />
                <Button
                  onClick={setDefaultBanner}
                  disabled={isSettingDefaultBanner || !defaultProfileBannerUrl}
                  className="mt-2 flex items-center"
                >
                  <FiImage className="mr-2" />
                  {isSettingDefaultBanner ? "Setting..." : "Use as My Banner"}
                </Button>
              </div>
            </div>
          </div>

          {/* Subscription Management Section */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-6">
              Subscription Management
            </h2>
            <div className="flex items-center mb-4">
              <div
                className={`h-3 w-3 rounded-full mr-2 ${
                  isSubscriptionActive ? "bg-green-500" : "bg-yellow-500"
                }`}
              ></div>
              <span className="font-medium">
                {isSubscriptionActive
                  ? "Active subscription"
                  : "No active subscription"}
              </span>
            </div>

            <p className="text-gray-600 mb-6">
              {isSubscriptionActive
                ? "You currently have an active subscription. You can manage your billing information and subscription plan through the customer portal."
                : "Upgrade to a yearly subscription to access premium features and save on your subscription."}
            </p>

            <div className="flex space-x-4">
              {isSubscriptionActive ? (
                <Button
                  onClick={handleManageSubscription}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={handleYearlyUpgrade}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Upgrade to Yearly
                </Button>
              )}
            </div>

            {/* Developer help info only in development mode */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 border border-yellow-200 bg-yellow-50 rounded-md">
                <h3 className="text-sm font-semibold text-yellow-800">
                  Developer Info
                </h3>
                <p className="text-xs text-yellow-700 mt-1">
                  To use subscription features, make sure you have:
                </p>
                <ul className="list-disc list-inside text-xs text-yellow-700 mt-1">
                  <li>Added a Stripe Secret Key to .env.local</li>
                  <li>Created a user document in Firestore</li>
                  <li>Added a stripeCustomerId field to the user document</li>
                </ul>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => user && createTestStripeCustomer(user.uid)}
                    className="text-xs bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                  >
                    <FiCode className="mr-1" />
                    Create Test Customer ID
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Account Security Section */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-6">Account Security</h2>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Delete Account</h3>
              <p className="text-gray-600 mb-4">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="flex items-center"
              >
                <FiTrash className="mr-2" />
                Delete Account
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium mb-2">Sign Out</h3>
              <p className="text-gray-600 mb-4">
                Sign out of your account on this device.
              </p>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center"
              >
                <FiLogOut className="mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Add Debug Claims component - only visible in development */}
          {process.env.NODE_ENV === "development" && <DebugClaims />}
        </div>

        <div>
          <SubscriptionStatus />
        </div>
      </div>

      {/* Delete account confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All of your data
              will be permanently deleted.
              {isSubscriptionActive && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                  You have an active subscription. Please cancel your
                  subscription first before deleting your account.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm font-medium">
              To confirm, please enter your email address:
            </p>
            <Input
              className="mt-2"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={user?.email || "your-email@example.com"}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmText !== user?.email}
            >
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

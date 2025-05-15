"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { updateUserProfile, signOut } from "@/lib/firebase/authUtils";
import ProfileView from "@/app/Components/ProfileView";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import ProfileImageUploader from "@/app/Components/ProfileImageUploader";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string>(
    "/placeholder-profile.png"
  );
  const [profileBannerUrl, setProfileBannerUrl] = useState<string>(
    "/placeholder-banner.png"
  );
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setEmail(user.email || "");
      setDisplayName(user.displayName || "");
      setIsOwner(true); // Set to true if this is the user's own profile

      // Try local storage first for fast loading
      const tryLocalImages = () => {
        const userId = user.uid;
        const profileImageKey = `profileImage-${userId}`;
        const profileBannerKey = `profileBanner-${userId}`;

        const savedProfileImage = localStorage.getItem(profileImageKey);
        const savedProfileBanner = localStorage.getItem(profileBannerKey);

        if (savedProfileImage) {
          setProfileImageUrl(savedProfileImage);
        } else if (user.photoURL) {
          // If no localStorage image but photoURL exists, use that
          setProfileImageUrl(user.photoURL);
          // Save to localStorage for next time
          localStorage.setItem(profileImageKey, user.photoURL);
        }

        if (savedProfileBanner) {
          setProfileBannerUrl(savedProfileBanner);
        }
      };

      // Try local storage immediately
      tryLocalImages();

      // Then load from Firestore for the most up-to-date data
      const fetchUserData = async () => {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Only update if we have actual data
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

            setImagesLoaded(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, [user, loading]);

  const handleUpdateProfile = async () => {
    try {
      const { error } = await updateUserProfile(displayName, profileImageUrl);
      if (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        return;
      }
      setIsEditing(false);

      // Save to localStorage for persistence
      if (user) {
        localStorage.setItem(`profileImage-${user.uid}`, profileImageUrl);
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        return;
      }
      toast.success("Signed out successfully!");
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // If not the profile owner, show public view
  if (!isOwner) {
    return (
      <ProfileView
        email={email}
        displayName={displayName}
        profileImageUrl={profileImageUrl}
        profileBannerUrl={profileBannerUrl}
      />
    );
  }

  // Profile owner view with edit capabilities
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Banner */}
        <div className="relative h-40 w-full">
          <ProfileImageUploader
            type="profileBanner"
            imageUrl={profileBannerUrl}
            onImageChange={setProfileBannerUrl}
            className="w-full h-full"
          />
        </div>

        <div className="px-4 py-5 sm:p-6 relative">
          {/* Profile Image */}
          <div className="absolute -top-16 left-6">
            <ProfileImageUploader
              type="profileImage"
              imageUrl={profileImageUrl}
              onImageChange={setProfileImageUrl}
              className="w-full shadow-md border-4 border-white"
            />
          </div>

          {/* Profile Information */}
          <div className="pt-16 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {displayName || "User"}
            </h1>
            <p className="text-gray-600">{email}</p>
          </div>

          <div className="mt-6 space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>

            {/* Display Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              {isEditing ? (
                <button
                  onClick={handleUpdateProfile}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save Changes
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit Profile
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

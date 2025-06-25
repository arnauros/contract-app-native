import React, { useState, useRef, useEffect } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { initFirebase } from "@/lib/firebase/firebase";
import { doc, updateDoc, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { updateProfile } from "firebase/auth";

interface ProfileImageUploaderProps {
  type: "profileImage" | "profileBanner";
  imageUrl: string;
  onImageChange: (url: string) => void;
  className?: string;
  isDefaultUpload?: boolean; // if true, set this as the default image for new users
}

export default function ProfileImageUploader({
  type,
  imageUrl,
  onImageChange,
  className,
  isDefaultUpload = false,
}: ProfileImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants for placeholder images
  const PROFILE_PLACEHOLDER = "/placeholders/profile.png";
  const BANNER_PLACEHOLDER = "/placeholders/banner.png";

  // Update local image when prop changes
  useEffect(() => {
    setLocalImageUrl(imageUrl);
  }, [imageUrl]);

  // Try to load image from localStorage on mount if it exists
  useEffect(() => {
    const loadSavedImage = () => {
      try {
        const userId = getAuth()?.currentUser?.uid;
        if (!userId) return;

        const storageKey = `${type}-${userId}`;
        const savedImage = localStorage.getItem(storageKey);

        // Only use saved image if it's a valid HTTP URL (not blob)
        if (
          savedImage &&
          savedImage.startsWith("http") &&
          savedImage !== imageUrl
        ) {
          setLocalImageUrl(savedImage);
          onImageChange(savedImage);
        }
      } catch (error) {
        console.error("Error loading saved image:", error);
      }
    };

    loadSavedImage();
  }, [type, imageUrl, onImageChange]);

  // Check if image is a default/placeholder image or empty
  const isDefaultImage =
    !localImageUrl ||
    localImageUrl === "/placeholder-profile.png" ||
    localImageUrl === PROFILE_PLACEHOLDER ||
    localImageUrl === "/placeholder-banner.png" ||
    localImageUrl === BANNER_PLACEHOLDER ||
    localImageUrl.includes("/placeholders/");

  // Function to determine if an image URL is a real remote image
  const isRemoteImage = (url: string) => {
    return (
      url.startsWith("http") &&
      !url.includes("placeholder") &&
      !url.includes("/placeholders/")
    );
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Initialize Firebase
      const { app: firebaseApp } = initFirebase();
      const auth = getAuth(firebaseApp);
      if (!auth.currentUser) {
        throw new Error("User must be authenticated to upload profile images");
      }
      const userId = auth.currentUser.uid;
      const timestamp = Date.now();

      // Upload to Firebase Storage
      const storage = getStorage(firebaseApp);
      const ext = file.name.split(".").pop();
      const storagePath =
        type === "profileImage"
          ? `users/${userId}/profile_${timestamp}.${ext}`
          : `users/${userId}/banner_${timestamp}.${ext}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);

      // Update local state and save
      setLocalImageUrl(downloadURL);
      onImageChange(downloadURL);
      localStorage.setItem(`${type}-${userId}`, downloadURL);

      // Update Firestore user document
      const db = getFirestore(firebaseApp);
      const userRef = doc(db, "users", userId);
      const fieldName =
        type === "profileImage" ? "profileImageUrl" : "profileBannerUrl";

      try {
        await updateDoc(userRef, {
          [fieldName]: downloadURL,
          updatedAt: new Date().toISOString(),
        });
        console.log(`✅ Firestore user document updated: ${fieldName}`);
      } catch (firestoreError) {
        console.error(
          "Error updating Firestore user document:",
          firestoreError
        );
        // Continue even if Firestore update fails - at least we have the image uploaded
      }

      // Update Firebase Auth profile if it's a profile image
      if (type === "profileImage" && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            photoURL: downloadURL,
          });
          console.log("✅ Firebase Auth profile updated");
        } catch (error) {
          console.warn("Failed to update auth profile:", error);
        }
      }

      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      const fallbackImage =
        type === "profileImage" ? PROFILE_PLACEHOLDER : BANNER_PLACEHOLDER;
      setLocalImageUrl(fallbackImage);
      onImageChange(fallbackImage);

      // More specific error messages
      const firebaseError = error as any;
      if (firebaseError?.code === "storage/unauthorized") {
        toast.error(
          "Permission denied. Please check your Firebase storage rules."
        );
      } else if (firebaseError?.code === "storage/canceled") {
        toast.error("Upload was cancelled.");
      } else if (firebaseError?.code === "storage/unknown") {
        toast.error("Unknown storage error. Please try again.");
      } else {
        toast.error("Failed to upload image. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (isDefaultImage) return;

    try {
      const { app: firebaseApp } = initFirebase();
      const storage = getStorage(firebaseApp);
      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);

      if (!auth.currentUser) {
        throw new Error("User must be authenticated to remove profile images");
      }

      const userId = auth.currentUser.uid;

      // Update Firestore to remove the image URL
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [type === "profileImage" ? "profileImageUrl" : "profileBannerUrl"]:
          null,
      });

      // Remove from localStorage
      const storageKey = `${type}-${userId}`;
      localStorage.removeItem(storageKey);

      // Try to delete from Firebase Storage if it's a Firebase URL
      if (localImageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const urlObj = new URL(localImageUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
          if (pathMatch && pathMatch[1]) {
            const encodedPath = pathMatch[1];
            const decodedPath = decodeURIComponent(encodedPath);
            const imageRef = ref(storage, decodedPath);
            await deleteObject(imageRef);
          }
        } catch (storageError) {
          console.error("Error deleting from storage:", storageError);
        }
      }

      // Update local state with default image
      const defaultImage =
        type === "profileImage" ? PROFILE_PLACEHOLDER : BANNER_PLACEHOLDER;
      setLocalImageUrl(defaultImage);
      onImageChange(defaultImage);

      toast.success(
        `${type === "profileImage" ? "Profile image" : "Banner"} removed`
      );
    } catch (error) {
      console.error(`Error removing ${type}:`, error);
      toast.error(
        `Failed to remove ${
          type === "profileImage" ? "profile image" : "banner"
        }`
      );
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Image container */}
      <div
        onClick={handleImageClick}
        className={`
          ${
            type === "profileImage"
              ? "h-32 w-32 bg-gray-100 rounded-full cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
              : "h-40 w-full bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
          }
        `}
      >
        {isDefaultImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <PhotoIcon className="h-6 w-6" />
            <span className="text-[10px] mt-1">
              {type === "profileImage"
                ? "Add profile image"
                : "Add banner image"}
            </span>
          </div>
        ) : (
          <img
            key={localImageUrl}
            src={localImageUrl}
            alt={type === "profileImage" ? "Profile image" : "Profile banner"}
            className={`w-full h-full object-cover ${
              type === "profileImage" ? "rounded-full" : ""
            }`}
            onError={(e) => {
              console.error(`Failed to load image: ${localImageUrl}`);
              // Simply fallback to placeholder - no canvas/blob URLs
              const fallbackImage =
                type === "profileImage"
                  ? PROFILE_PLACEHOLDER
                  : BANNER_PLACEHOLDER;
              setLocalImageUrl(fallbackImage);
              onImageChange(fallbackImage);
            }}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* Remove button */}
      {!isDefaultImage && (
        <button
          onClick={handleRemoveImage}
          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          title={`Remove ${type}`}
        >
          <XMarkIcon className="h-4 w-4 text-gray-500" />
        </button>
      )}

      {/* Loading overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}

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

// Create a default gradient banner image
const createGradientBanner = () => {
  // Check if we're in the browser environment
  if (typeof document === "undefined") return "/placeholder-banner.png";

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "/placeholder-banner.png";

    // Create a gradient from blue to indigo
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#EBF4FF"); // light blue
    gradient.addColorStop(1, "#E0E7FF"); // light indigo

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
  } catch (error) {
    console.error("Error creating gradient banner:", error);
    return "/placeholder-banner.png";
  }
};

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
  const [defaultBannerUrl, setDefaultBannerUrl] = useState(
    "/placeholder-banner.png"
  );

  // Generate gradient banner image on client side
  useEffect(() => {
    if (type === "profileBanner") {
      setDefaultBannerUrl(createGradientBanner());
    }
  }, [type]);

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

        if (savedImage && savedImage !== imageUrl) {
          setLocalImageUrl(savedImage);
          onImageChange(savedImage);
        }
      } catch (error) {
        console.error("Error loading saved image:", error);
      }
    };

    loadSavedImage();
  }, [type, imageUrl, onImageChange]);

  const isDefaultImage =
    (type === "profileImage" && localImageUrl === "/placeholder-profile.png") ||
    (type === "profileBanner" &&
      (localImageUrl === "/placeholder-banner.png" ||
        localImageUrl === defaultBannerUrl));

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Initialize Firebase just to get auth
      const { app: firebaseApp } = initFirebase();
      const auth = getAuth(firebaseApp);

      if (!auth.currentUser) {
        throw new Error("User must be authenticated to upload profile images");
      }

      const userId = auth.currentUser.uid;
      const timestamp = Date.now();

      // Try using the server API route to upload the file
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", userId);
        formData.append("type", type);

        // Upload with retry logic
        const uploadResult = await uploadWithRetry("/api/upload", formData);

        if (uploadResult.success && uploadResult.url) {
          await handleUploadSuccess(uploadResult.url, userId, auth.currentUser);
          return;
        }

        console.warn(
          "Server upload failed, falling back to direct upload:",
          uploadResult.error
        );
      } catch (apiError) {
        console.warn(
          "Server API upload failed, falling back to direct upload:",
          apiError
        );
      }

      // Fallback to direct upload if server upload fails
      console.log("Using direct upload as fallback");
      const storage = getStorage(firebaseApp);
      const db = getFirestore(firebaseApp);

      // Create unique file name
      const fileName = `${timestamp}-${file.name.replace(/\s+/g, "_")}`;

      // Create reference to the file location
      const fileRef = ref(storage, `users/${userId}/${type}/${fileName}`);

      // Convert file to Uint8Array for upload
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Add metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          timestamp: timestamp.toString(),
          userId,
          type,
        },
      };

      try {
        // Upload the file with direct method
        const snapshot = await uploadBytes(fileRef, uint8Array, metadata);

        // Get download URL with cache busting
        const downloadURL = `${await getDownloadURL(
          snapshot.ref
        )}?t=${timestamp}`;

        // Update Firestore
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          [type === "profileImage" ? "profileImageUrl" : "profileBannerUrl"]:
            downloadURL,
        });

        // Handle upload success
        await handleUploadSuccess(downloadURL, userId, auth.currentUser);
      } catch (directUploadError) {
        console.error("Direct upload failed:", directUploadError);
        // Try to extract CORS error message if present
        const errorMessage =
          directUploadError instanceof Error
            ? directUploadError.message
            : String(directUploadError);

        if (errorMessage.includes("CORS") || errorMessage.includes("cors")) {
          toast.error(
            `CORS error: Unable to upload directly to Firebase Storage. Please try again later.`
          );
        } else {
          toast.error(
            `Failed to upload image: ${errorMessage.substring(0, 100)}`
          );
        }

        throw directUploadError;
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(
        `Failed to upload ${
          type === "profileImage" ? "profile image" : "banner"
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to handle post-upload tasks
  const handleUploadSuccess = async (
    downloadURL: string,
    userId: string,
    currentUser: any
  ) => {
    // If this is a profile image, also update in Firebase Auth
    if (type === "profileImage" && currentUser) {
      await updateProfile(currentUser, {
        photoURL: downloadURL,
      });
    }

    // Save to localStorage for persistence across browser sessions
    const storageKey = `${type}-${userId}`;
    localStorage.setItem(storageKey, downloadURL);

    // Also save to sessionStorage for immediate availability
    sessionStorage.setItem(storageKey, downloadURL);

    // Update local state
    setLocalImageUrl(downloadURL);
    onImageChange(downloadURL);

    // If this is a default upload, update the default image field
    if (isDefaultUpload) {
      const storageDefaultKey = `default${
        type.charAt(0).toUpperCase() + type.slice(1)
      }-${userId}`;
      localStorage.setItem(storageDefaultKey, downloadURL);

      toast.success(
        `Default ${
          type === "profileImage" ? "profile image" : "banner"
        } set successfully`
      );
    } else {
      toast.success(
        `${
          type === "profileImage" ? "Profile image" : "Banner"
        } uploaded successfully`
      );
    }
  };

  // Helper function to retry uploads with exponential backoff
  const uploadWithRetry = async (
    url: string,
    formData: FormData,
    maxRetries = 3
  ) => {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        console.log(`API upload attempt ${attempt + 1}`);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        const responseData = await response.json();

        // Check if it's a mock response from development mode
        if (responseData.mock) {
          console.log("Received mock response from server:", responseData);
          return responseData;
        }

        if (!response.ok) {
          // Even with a non-200 status, we might have JSON with error details
          throw new Error(
            `Server responded with ${response.status}: ${
              responseData.error || "Unknown error"
            }`
          );
        }

        return responseData;
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`API upload attempt ${attempt} failed:`, error);

        if (attempt >= maxRetries) {
          console.error("Maximum API upload retries reached");
          console.log("Falling back to direct upload");
          break;
        }

        // Wait with exponential backoff before retrying
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${delay}ms before retry`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError?.message || "Upload failed after retries",
      fallback: true,
    };
  };

  const handleRemoveImage = async () => {
    if (isDefaultImage) return;

    try {
      // Initialize Firebase
      const { app: firebaseApp } = initFirebase();
      const storage = getStorage(firebaseApp);
      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);

      if (!auth.currentUser) {
        throw new Error("User must be authenticated to remove profile images");
      }

      const userId = auth.currentUser.uid;

      // Get the default image URL from Firestore if available
      const userRef = doc(db, "users", userId);

      // Update Firestore to remove the image URL
      await updateDoc(userRef, {
        [type === "profileImage" ? "profileImageUrl" : "profileBannerUrl"]:
          null,
      });

      // Remove from localStorage
      const storageKey = `${type}-${userId}`;
      localStorage.removeItem(storageKey);

      // Try to delete from storage if it's a Firebase URL
      if (localImageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          // Extract the path from the URL
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
          // Continue even if storage deletion fails
        }
      }

      // Update local state with default image
      const defaultImage =
        type === "profileImage" ? "/placeholder-profile.png" : defaultBannerUrl;
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
        style={
          type === "profileBanner" && isDefaultImage
            ? {
                backgroundImage: `url(${defaultBannerUrl})`,
                backgroundSize: "cover",
              }
            : {}
        }
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
            src={localImageUrl}
            alt={type === "profileImage" ? "Profile image" : "Profile banner"}
            className={`w-full h-full object-cover ${
              type === "profileImage" ? "rounded-full" : ""
            }`}
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

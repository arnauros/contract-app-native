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
  if (typeof document === "undefined") return "/placeholders/banner.png";

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "/placeholders/banner.png";

    // Create a gradient from blue to indigo
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#EBF4FF"); // light blue
    gradient.addColorStop(1, "#E0E7FF"); // light indigo

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
  } catch (error) {
    console.error("Error creating gradient banner:", error);
    return "/placeholders/banner.png";
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
    "/placeholders/banner.png"
  );

  // Constants for placeholder images
  const PROFILE_PLACEHOLDER = "/placeholders/profile.png";
  const BANNER_PLACEHOLDER = "/placeholders/banner.png";

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

  // Check if image is a default/placeholder image or empty
  const isDefaultImage =
    !localImageUrl ||
    localImageUrl === "/placeholder-profile.png" ||
    localImageUrl === PROFILE_PLACEHOLDER ||
    localImageUrl === "/placeholder-banner.png" ||
    localImageUrl === BANNER_PLACEHOLDER ||
    localImageUrl === defaultBannerUrl ||
    localImageUrl.includes("/placeholders/");

  // Function to determine if an image URL is a real remote image
  const isRemoteImage = (url: string) => {
    return (
      (url.startsWith("http") || url.startsWith("data:")) &&
      !url.includes("placeholder") &&
      !url.includes("/placeholders/")
    );
  };

  // Log the image URL when it changes for debugging
  useEffect(() => {
    console.log(`${type} URL:`, localImageUrl);
    console.log(`${type} is default image:`, isDefaultImage);
    console.log(`${type} is remote image:`, isRemoteImage(localImageUrl));
  }, [localImageUrl, type, isDefaultImage]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Store the local file URL for immediate display
      const localFileUrl = URL.createObjectURL(file);
      console.log("Created local object URL:", localFileUrl);

      // Initialize Firebase
      const { app: firebaseApp } = initFirebase();
      const auth = getAuth(firebaseApp);

      if (!auth.currentUser) {
        throw new Error("User must be authenticated to upload profile images");
      }

      const userId = auth.currentUser.uid;
      const timestamp = Date.now();

      // In development mode, we can use the local file directly
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.FIREBASE_SERVICE_ACCOUNT
      ) {
        console.log(
          "Development mode without Firebase credentials - using local file directly"
        );
        // This will show the actual image without uploading to Firebase
        await handleUploadSuccess(localFileUrl, userId, auth.currentUser);
        return;
      }

      // Standard upload flow continues here for production...

      // Trying server-side upload first to avoid CORS issues
      try {
        console.log("Trying server-side upload to avoid CORS issues...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", userId);
        formData.append("type", type);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Server upload failed: ${error}`);
        }

        const result = await response.json();
        console.log("Server upload successful:", result);

        if (result.url) {
          // Verify that the URL is valid and not a local placeholder
          if (result.url.startsWith("http") || result.url.startsWith("data:")) {
            console.log("Using remote image URL from server:", result.url);
            await handleUploadSuccess(result.url, userId, auth.currentUser);
            return;
          } else if (process.env.NODE_ENV === "development") {
            // In development, we may get a local URL - use it anyway
            console.log("Using local URL in development:", result.url);
            await handleUploadSuccess(result.url, userId, auth.currentUser);
            return;
          } else {
            console.warn("Server returned non-remote URL:", result.url);
          }
        }

        throw new Error("Server response missing URL");
      } catch (serverError) {
        console.warn("Server-side upload failed:", serverError);

        // Only attempt direct upload if explicitly requested
        if (process.env.NEXT_PUBLIC_ENABLE_DIRECT_UPLOAD !== "true") {
          throw new Error("Server upload failed and direct upload is disabled");
        }

        console.log("Attempting direct upload as fallback...");
      }

      // If we get here, try direct upload as fallback (will likely fail due to CORS)
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
        console.log("Starting direct Firebase Storage upload...");
        const snapshot = await uploadBytes(fileRef, uint8Array, metadata);

        // Get download URL with cache busting
        const downloadURL = `${await getDownloadURL(
          snapshot.ref
        )}?t=${timestamp}`;
        console.log("Upload successful, URL:", downloadURL);

        // Update Firestore
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          [type === "profileImage" ? "profileImageUrl" : "profileBannerUrl"]:
            downloadURL,
        });

        // Handle upload success
        await handleUploadSuccess(downloadURL, userId, auth.currentUser);
      } catch (uploadError) {
        console.error("Direct upload failed:", uploadError);

        // Try to extract CORS error message if present
        const errorMessage =
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError);

        if (errorMessage.includes("CORS") || errorMessage.includes("cors")) {
          toast.error(
            `CORS error: Unable to upload to Firebase Storage directly. Please contact support.`
          );
        } else {
          toast.error(
            `Failed to upload image: ${errorMessage.substring(0, 100)}`
          );
        }

        throw uploadError;
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
    console.log("Processing successful upload, URL:", downloadURL);

    // If this is a profile image, also update in Firebase Auth
    if (type === "profileImage" && currentUser) {
      try {
        await updateProfile(currentUser, {
          photoURL: downloadURL,
        });
        console.log("Updated Firebase Auth profile");
      } catch (error) {
        console.warn("Failed to update auth profile:", error);
        // Continue even if this fails
      }
    }

    // Save to localStorage for persistence across browser sessions
    const storageKey = `${type}-${userId}`;
    localStorage.setItem(storageKey, downloadURL);
    console.log(`Saved to localStorage: ${storageKey}`, downloadURL);

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

        // Check if the API returned a valid response
        if (!response.ok) {
          // Even with a non-200 status, we might have JSON with error details
          throw new Error(
            `Server responded with ${response.status}: ${
              responseData.error || "Unknown error"
            }`
          );
        }

        // Validate that we received a proper URL
        if (!responseData.url) {
          throw new Error("Server response missing URL");
        }

        console.log("Received API response:", responseData);
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
            key={localImageUrl}
            src={localImageUrl}
            alt={type === "profileImage" ? "Profile image" : "Profile banner"}
            className={`w-full h-full object-cover ${
              type === "profileImage" ? "rounded-full" : ""
            }`}
            onError={(e) => {
              console.error(`Failed to load image: ${localImageUrl}`);

              // If image fails to load, show the default
              if (!isRemoteImage(localImageUrl)) {
                // For local paths that fail, use a simple colored background
                console.log(
                  "Local image failed to load, using simple colored background"
                );

                // Create a canvas for a simple colored background
                try {
                  const canvas = document.createElement("canvas");
                  const size = type === "profileImage" ? 200 : 800;
                  const height = type === "profileImage" ? 200 : 200;
                  canvas.width = size;
                  canvas.height = height;
                  const ctx = canvas.getContext("2d");

                  if (ctx) {
                    // Draw a colored rectangle
                    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 80%)`;
                    ctx.fillRect(0, 0, size, height);

                    // Add text
                    ctx.fillStyle = "white";
                    ctx.font = "20px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(
                      type === "profileImage" ? "User" : "Banner",
                      size / 2,
                      height / 2
                    );

                    // Set the image source to the canvas data URL
                    e.currentTarget.src = canvas.toDataURL();
                    return;
                  }
                } catch (canvasError) {
                  console.error("Canvas fallback failed:", canvasError);
                }
              }

              // If all else fails, use the placeholder
              e.currentTarget.style.display = "none";
              setLocalImageUrl(
                type === "profileImage"
                  ? PROFILE_PLACEHOLDER
                  : BANNER_PLACEHOLDER
              );
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

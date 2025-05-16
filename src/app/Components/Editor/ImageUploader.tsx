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
import { doc, updateDoc, getFirestore, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface ImageUploaderProps {
  type: "logo" | "banner";
  contractId: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
  className?: string;
  useDefaultIfEmpty?: boolean;
}

// Helper function to create a gradient banner
const createGradientBanner = () => {
  // Create a random gradient for the banner
  const colors = [
    ["#4F46E5", "#7C3AED"], // Indigo to Purple
    ["#2563EB", "#3B82F6"], // Blue shades
    ["#0891B2", "#06B6D4"], // Cyan shades
    ["#059669", "#10B981"], // Green shades
    ["#7C3AED", "#8B5CF6"], // Purple shades
  ];

  const randomPair = colors[Math.floor(Math.random() * colors.length)];
  return `linear-gradient(135deg, ${randomPair[0]}, ${randomPair[1]})`;
};

export default function ImageUploader({
  type,
  contractId,
  imageUrl,
  onImageChange,
  className,
  useDefaultIfEmpty = true,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [defaultBannerUrl, setDefaultBannerUrl] = useState(
    "/placeholder-banner.png"
  );

  // Generate gradient banner image on client side
  useEffect(() => {
    if (type === "banner") {
      setDefaultBannerUrl(createGradientBanner());
    }
  }, [type]);

  // Ensure imageUrl has proper path
  useEffect(() => {
    // Ensure the imageUrl has a leading slash if it's a relative path
    if (imageUrl && !imageUrl.startsWith("/") && !imageUrl.startsWith("http")) {
      console.log(`Fixing imageUrl format for ${type}:`, imageUrl);
      onImageChange(`/${imageUrl}`);
    }
  }, [imageUrl, type, onImageChange]);

  // If image is default and useDefaultIfEmpty is true, try to load default profile image
  useEffect(() => {
    const loadDefaultProfileImage = async () => {
      if (!useDefaultIfEmpty) return;

      const isDefaultImage =
        (type === "logo" && imageUrl === "/placeholder-logo.png") ||
        (type === "banner" &&
          (imageUrl === "/placeholder-banner.png" ||
            imageUrl === defaultBannerUrl));

      if (!isDefaultImage) return;

      try {
        // Try to get user ID from localStorage
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        // Check localStorage first for default images
        const defaultImageKey = `default${
          type === "logo" ? "ProfileImage" : "ProfileBanner"
        }-${userId}`;
        const defaultImage = localStorage.getItem(defaultImageKey);

        if (defaultImage) {
          onImageChange(defaultImage);
          return;
        }

        // If not in localStorage, try Firestore
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fieldName =
            type === "logo"
              ? "defaultProfileImageUrl"
              : "defaultProfileBannerUrl";

          if (userData[fieldName]) {
            onImageChange(userData[fieldName]);
            // Also save to localStorage for next time
            localStorage.setItem(defaultImageKey, userData[fieldName]);
          }
        }
      } catch (error) {
        console.error("Error loading default profile image:", error);
      }
    };

    loadDefaultProfileImage();
  }, [type, imageUrl, defaultBannerUrl, onImageChange, useDefaultIfEmpty]);

  const isDefaultImage =
    (type === "logo" && imageUrl === "/placeholder-logo.png") ||
    (type === "banner" &&
      (imageUrl === "/placeholder-banner.png" ||
        imageUrl === defaultBannerUrl));

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      console.log(`🖼️ Starting ${type} upload for contract ${contractId}`);

      // Initialize Firebase
      const { app: firebaseApp } = initFirebase();
      const auth = getAuth(firebaseApp);
      const storage = getStorage(firebaseApp);
      const db = getFirestore(firebaseApp);

      // Create unique file name with timestamp for cache busting
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/\s+/g, "_")}`;

      console.log(`📁 Created filename: ${fileName}`);

      // Try using the server API route first
      try {
        console.log(`🔄 Attempting server-side upload via API route`);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", auth.currentUser?.uid || "anonymous");
        formData.append("type", type);
        formData.append("contractId", contractId);

        // Upload with retry logic
        const uploadResult = await uploadWithServerRetry(
          "/api/upload",
          formData
        );

        if (uploadResult.success && uploadResult.url) {
          console.log(`✅ Server upload successful: ${uploadResult.url}`);

          // Update Firestore with the image URL
          console.log(
            `📝 Updating Firestore document for contract ${contractId}`
          );
          const contractRef = doc(db, "contracts", contractId);

          try {
            const fieldToUpdate = type === "logo" ? "logoUrl" : "bannerUrl";
            await updateDoc(contractRef, {
              [fieldToUpdate]: uploadResult.url,
            });
            console.log(
              `✅ Firestore update successful for field: ${fieldToUpdate}`
            );
          } catch (firestoreError) {
            console.error(`❌ Firestore update failed:`, firestoreError);
            // Still continue with local updates even if Firestore fails
            toast.error(
              `Warning: Image uploaded but database update failed. Try refreshing the page.`
            );
          }

          // Update local state
          onImageChange(uploadResult.url);
          console.log(`🔄 Local state updated with new image URL`);

          // Save to localStorage for backup
          localStorage.setItem(
            `contract-${type}-${contractId}`,
            uploadResult.url
          );
          console.log(`💾 Image URL saved to localStorage`);

          toast.success(
            `${type === "logo" ? "Logo" : "Banner"} uploaded successfully`
          );
          setIsUploading(false);
          return;
        }

        console.warn(
          `⚠️ Server upload failed, falling back to direct upload:`,
          uploadResult.error
        );
      } catch (apiError) {
        console.warn(
          `⚠️ Server API upload failed, falling back to direct upload:`,
          apiError
        );
      }

      // Fallback to direct upload
      console.log(`🔄 Starting direct upload to Firebase Storage`);

      // Create reference to the file location
      const fileRef = ref(
        storage,
        `contracts/${contractId}/${type}/${fileName}`
      );

      // Add custom metadata to help with CORS
      const metadata = {
        contentType: file.type,
        customMetadata: {
          timestamp: timestamp.toString(),
          contractId: contractId,
          type: type,
        },
      };

      // Convert file to Uint8Array for upload
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Try uploading using retry logic
      let snapshot;
      try {
        snapshot = await uploadWithRetry(fileRef, uint8Array, metadata);
        console.log(`✅ Upload to Firebase Storage successful`);
      } catch (uploadError) {
        console.error("❌ Upload failed after retries:", uploadError);
        throw uploadError;
      }

      // Get the download URL - add timestamp parameter to prevent caching
      let downloadURL = await getDownloadURL(snapshot.ref);
      // Add cache busting query parameter
      downloadURL = `${downloadURL}?t=${timestamp}`;

      console.log(`🔗 Generated download URL: ${downloadURL}`);

      // Update Firestore with the image URL
      console.log(`📝 Updating Firestore document for contract ${contractId}`);
      const contractRef = doc(db, "contracts", contractId);

      try {
        const fieldToUpdate = type === "logo" ? "logoUrl" : "bannerUrl";
        await updateDoc(contractRef, {
          [fieldToUpdate]: downloadURL,
        });
        console.log(
          `✅ Firestore update successful for field: ${fieldToUpdate}`
        );
      } catch (firestoreError) {
        console.error(`❌ Firestore update failed:`, firestoreError);
        // Still continue with local updates even if Firestore fails
        toast.error(
          `Warning: Image uploaded but database update failed. Try refreshing the page.`
        );
      }

      // Update local state
      onImageChange(downloadURL);
      console.log(`🔄 Local state updated with new image URL`);

      // Save to localStorage for backup
      localStorage.setItem(`contract-${type}-${contractId}`, downloadURL);
      console.log(`💾 Image URL saved to localStorage`);

      toast.success(
        `${type === "logo" ? "Logo" : "Banner"} uploaded successfully`
      );
    } catch (error) {
      console.error(`❌ Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type === "logo" ? "logo" : "banner"}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to retry server uploads with exponential backoff
  const uploadWithServerRetry = async (
    url: string,
    formData: FormData,
    maxRetries = 3
  ) => {
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      try {
        console.log(`Server upload attempt ${attempt + 1} for ${type}`);

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
        lastError = error;
        console.warn(`Server upload attempt ${attempt} failed:`, error);

        if (attempt >= maxRetries) {
          console.error("Maximum server upload retries reached");
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
      error: lastError instanceof Error ? lastError.message : String(lastError),
      fallback: true,
    };
  };

  // Helper function to retry uploads with exponential backoff
  const uploadWithRetry = async (
    fileRef: any,
    data: Uint8Array,
    metadata: any,
    maxRetries = 3
  ) => {
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      try {
        console.log(`Upload attempt ${attempt + 1} for ${type}`);
        return await uploadBytes(fileRef, data, metadata);
      } catch (error) {
        attempt++;
        lastError = error;
        console.warn(`Upload attempt ${attempt} failed:`, error);

        if (attempt >= maxRetries) {
          console.error("Maximum upload retries reached");
          break;
        }

        // Wait with exponential backoff before retrying
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };

  const handleRemoveImage = async () => {
    if (isDefaultImage) return;

    try {
      // Initialize Firebase
      const { app: firebaseApp } = initFirebase();
      const storage = getStorage(firebaseApp);
      const db = getFirestore(firebaseApp);

      // Update Firestore to remove the image URL
      const contractRef = doc(db, "contracts", contractId);
      await updateDoc(contractRef, {
        [type === "logo" ? "logoUrl" : "bannerUrl"]: null,
      });

      // Try to delete from storage if it's a Firebase URL
      if (imageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          // Extract the path from the URL
          const urlObj = new URL(imageUrl);
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
      onImageChange(
        type === "logo" ? "/placeholder-logo.png" : defaultBannerUrl
      );

      // Remove from localStorage
      localStorage.removeItem(`contract-${type}-${contractId}`);

      toast.success(`${type === "logo" ? "Logo" : "Banner"} removed`);
    } catch (error) {
      console.error(`Error removing ${type}:`, error);
      toast.error(`Failed to remove ${type === "logo" ? "logo" : "banner"}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Image container */}
      <div
        onClick={handleImageClick}
        className={`
          ${
            type === "logo"
              ? "h-32 w-32 bg-gray-100 rounded-lg cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
              : "h-40 w-full bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
          }
        `}
        style={
          type === "banner" && isDefaultImage
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
              {type === "logo" ? "Add logo" : "Add banner image"}
            </span>
          </div>
        ) : (
          <>
            {/* Add a key with timestamp to force re-render when the URL changes */}
            <img
              key={`${type}-${imageUrl}`}
              src={
                imageUrl + (imageUrl.includes("?") ? "" : `?t=${Date.now()}`)
              }
              alt={type === "logo" ? "Contract logo" : "Contract banner"}
              className="w-full h-full object-cover"
              onLoad={() => {
                console.log(`${type} image loaded successfully:`, imageUrl);
              }}
              onError={(e) => {
                console.error(`${type} image failed to load:`, imageUrl, e);
                // If image fails to load, reset to the correct default
                if (type === "logo" && imageUrl !== "/placeholder-logo.png") {
                  console.log(
                    `Resetting to default logo image after load failure`
                  );
                  onImageChange("/placeholder-logo.png");
                } else if (
                  type === "banner" &&
                  imageUrl !== "/placeholder-banner.png" &&
                  imageUrl !== defaultBannerUrl
                ) {
                  console.log(
                    `Resetting to default banner image after load failure`
                  );
                  onImageChange("/placeholder-banner.png");
                }
              }}
            />
          </>
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

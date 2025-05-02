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
import { initFirebase } from "@/lib/firebase/init";
import { doc, updateDoc, getFirestore } from "firebase/firestore";

interface ImageUploaderProps {
  type: "logo" | "banner";
  contractId: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
  className?: string;
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

export default function ImageUploader({
  type,
  contractId,
  imageUrl,
  onImageChange,
  className,
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

      // Initialize Firebase
      const app = initFirebase();
      const storage = getStorage(app);
      const db = getFirestore(app);

      // Create unique file name
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;

      // Create reference to the file location
      const fileRef = ref(
        storage,
        `contracts/${contractId}/${type}/${fileName}`
      );

      // Convert file to Uint8Array for upload
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Upload the file
      const snapshot = await uploadBytes(fileRef, uint8Array, {
        contentType: file.type,
      });

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update Firestore with the image URL
      const contractRef = doc(db, "contracts", contractId);
      await updateDoc(contractRef, {
        [type === "logo" ? "logoUrl" : "bannerUrl"]: downloadURL,
      });

      // Update local state
      onImageChange(downloadURL);

      // Save to localStorage for backup
      localStorage.setItem(`contract-${type}-${contractId}`, downloadURL);

      toast.success(
        `${type === "logo" ? "Logo" : "Banner"} uploaded successfully`
      );
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type === "logo" ? "logo" : "banner"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (isDefaultImage) return;

    try {
      // Initialize Firebase
      const app = initFirebase();
      const storage = getStorage(app);
      const db = getFirestore(app);

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
          <img
            src={imageUrl}
            alt={type === "logo" ? "Contract logo" : "Contract banner"}
            className="w-full h-full object-cover"
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

import { NextRequest, NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK if not already initialized
function initFirebaseAdmin() {
  try {
    if (getApps().length === 0) {
      // Check if we have the service account credentials
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
        return null;
      }

      // Parse the service account JSON
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (error) {
        console.error("Invalid FIREBASE_SERVICE_ACCOUNT format:", error);
        return null;
      }

      // Initialize the app
      return initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
    return getApps()[0];
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as string;

    console.log("Upload API request received:", { userId, type });

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // In development, always return a mock response for testing
    // This avoids Firebase Admin configuration issues during development
    if (process.env.NODE_ENV === "development") {
      const timestamp = Date.now();
      const fileName = file.name.replace(/\s+/g, "_");

      // Ensure we return the correct placeholder for each type
      let mockUrl;
      if (type === "logo") {
        mockUrl = `/placeholder-logo.png?t=${timestamp}`;
        console.log("🖼️ [DEV] Using logo placeholder:", mockUrl);
      } else if (type === "profileImage") {
        mockUrl = `/placeholder-profile.png?t=${timestamp}`;
        console.log("🖼️ [DEV] Using profile placeholder:", mockUrl);
      } else if (type === "banner" || type === "profileBanner") {
        mockUrl = `/placeholder-banner.png?t=${timestamp}`;
        console.log("🖼️ [DEV] Using banner placeholder:", mockUrl);
      } else {
        // Default to logo for any other type
        mockUrl = `/placeholder-logo.png?t=${timestamp}`;
        console.log(
          "🖼️ [DEV] Using default placeholder for unknown type:",
          type
        );
      }

      console.log("🔄 [DEV] Mock upload complete. Returning URL:", mockUrl);

      return NextResponse.json({
        success: true,
        url: mockUrl,
        path: `mock/users/${userId}/${type}/${timestamp}-${fileName}`,
        mock: true,
      });
    }

    // For production, use Firebase Admin SDK
    const app = initFirebaseAdmin();
    if (!app) {
      console.error("Failed to initialize Firebase Admin SDK");
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Firebase Admin SDK initialization failed",
        },
        { status: 500 }
      );
    }

    try {
      // Get storage reference
      const storage = getStorage(app);
      const bucket = storage.bucket();

      if (!bucket) {
        throw new Error("Storage bucket not available");
      }

      // Create a unique file name with timestamp
      const timestamp = Date.now();
      const originalName = file.name.replace(/\s+/g, "_");
      const fileName = `${timestamp}-${originalName}`;

      // Determine the path based on type
      let filePath;
      if (type === "profileImage" || type === "profileBanner") {
        filePath = `users/${userId}/${type}/${fileName}`;
      } else if (type === "logo" || type === "banner") {
        // For contract images
        const contractId = formData.get("contractId") as string;
        if (!contractId) {
          return NextResponse.json(
            { error: "Missing contractId for contract image upload" },
            { status: 400 }
          );
        }
        filePath = `contracts/${contractId}/${type}/${fileName}`;
      } else {
        filePath = `uploads/${userId}/${type}/${fileName}`;
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create file in bucket
      const fileRef = bucket.file(filePath);

      // Upload with metadata
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            timestamp: timestamp.toString(),
            userId,
            type,
            originalName,
          },
        },
      });

      // Make the file publicly accessible
      await fileRef.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      // Add cache busting parameter
      const downloadURL = `${publicUrl}?t=${timestamp}`;

      // Update Firestore if needed
      if (type === "profileImage" || type === "profileBanner") {
        const db = getFirestore(app);
        const userRef = db.collection("users").doc(userId);

        await userRef.update({
          [type === "profileImage" ? "profileImageUrl" : "profileBannerUrl"]:
            downloadURL,
        });
      }

      console.log(`File uploaded successfully: ${filePath}`);

      return NextResponse.json({
        success: true,
        url: downloadURL,
        path: filePath,
      });
    } catch (uploadError) {
      console.error("Error during server-side upload:", uploadError);
      return NextResponse.json(
        {
          error: "Upload failed",
          details:
            uploadError instanceof Error
              ? uploadError.message
              : String(uploadError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing upload request:", error);
    return NextResponse.json(
      {
        error: "Failed to process upload request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

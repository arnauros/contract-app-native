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
  console.log("⬆️ Server-side upload API called");

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as string;

    console.log("Upload API request received:", {
      userId,
      type,
      fileName: file?.name,
    });

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin SDK
    const app = initFirebaseAdmin();
    if (!app) {
      console.error("Failed to initialize Firebase Admin SDK");

      // Check if we're in development and missing Firebase credentials
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.FIREBASE_SERVICE_ACCOUNT
      ) {
        console.log("Development mode without Firebase credentials");

        try {
          // For development, read the file and convert it to a data URL
          // This allows the actual uploaded image to be displayed without Firebase
          const arrayBuffer = await file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const dataUrl = `data:${file.type};base64,${base64}`;

          console.log("Converted uploaded file to data URL");

          return NextResponse.json({
            success: true,
            url: dataUrl,
            path: `mock/${type}/${Date.now()}`,
            mock: true,
          });
        } catch (error) {
          console.error(
            "Failed to create data URL from file, falling back to SVG:",
            error
          );

          // Fall back to SVG if file processing fails
          const colors = [
            "#4F46E5",
            "#3B82F6",
            "#06B6D4",
            "#10B981",
            "#84CC16",
          ];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const timestamp = Date.now();

          // Create SVG for profile (square) or banner (rectangle)
          const svg =
            type === "profileImage"
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                <rect width="200" height="200" fill="${randomColor}" />
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="48" fill="white">
                  User
                </text>
              </svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" viewBox="0 0 800 200">
                <rect width="800" height="200" fill="${randomColor}" />
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="48" fill="white">
                  Banner
                </text>
              </svg>`;

          // Convert to data URL
          const dataUrl = `data:image/svg+xml;base64,${Buffer.from(
            svg
          ).toString("base64")}`;

          return NextResponse.json({
            success: true,
            url: dataUrl,
            path: `mock/${type}/${timestamp}`,
            mock: true,
          });
        }
      }

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

      console.log(`📁 Server uploading to path: ${filePath}`);

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

      console.log(`✅ File uploaded successfully: ${filePath}`);
      console.log(`🔗 Download URL: ${downloadURL}`);

      return NextResponse.json({
        success: true,
        url: downloadURL,
        path: filePath,
      });
    } catch (uploadError) {
      console.error("❌ Error during server-side upload:", uploadError);
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
    console.error("❌ Error processing upload request:", error);
    return NextResponse.json(
      {
        error: "Failed to process upload request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

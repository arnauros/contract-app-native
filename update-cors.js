import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin with service account
try {
  // This will use the credentials from GOOGLE_APPLICATION_CREDENTIALS env var
  // or the service account included in your project
  const app = initializeApp({
    storageBucket: "freelance-project-3d0b5.appspot.com",
  });

  const bucket = getStorage().bucket();

  // Set CORS configuration
  bucket
    .setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        maxAgeSeconds: 3600,
        responseHeader: [
          "Content-Type",
          "Content-Length",
          "Access-Control-Allow-Origin",
          "ETag",
          "X-Download-Options",
          "X-Request-Id",
          "X-Content-Type-Options",
          "X-Goog-*",
          "Authorization",
          "Cache-Control",
        ],
      },
    ])
    .then(() => {
      console.log("CORS settings updated successfully");
    })
    .catch((error) => {
      console.error("Error updating CORS settings:", error);
    });
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

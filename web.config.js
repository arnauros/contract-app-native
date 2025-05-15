// web.config.js
// This file contains configuration for the web application

/**
 * Function to handle CORS issues when uploading to Firebase Storage
 * This adds the necessary headers to the fetch requests
 */
export const configureStorage = () => {
  // Add a global fetch interceptor for Firebase Storage requests
  const originalFetch = window.fetch;

  window.fetch = async function (input, init = {}) {
    // Only intercept Firebase Storage requests
    if (
      typeof input === "string" &&
      input.includes("firebasestorage.googleapis.com")
    ) {
      // Add CORS headers
      const newInit = {
        ...init,
        mode: "cors",
        credentials: "include",
        headers: {
          ...init.headers,
          "Access-Control-Allow-Origin": "*",
        },
      };

      // For OPTIONS requests, handle them specially
      if (init.method === "OPTIONS") {
        return new Response(null, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
          },
        });
      }

      return originalFetch(input, newInit);
    }

    // For all other requests, use the original fetch
    return originalFetch(input, init);
  };
};

/**
 * Configure Firebase Storage with custom retry logic for uploads
 */
export const configureStorageUpload = (storage) => {
  // Add retry logic for failed uploads
  const originalUploadBytes = storage.uploadBytes;

  storage.uploadBytes = async function (ref, data, metadata) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        return await originalUploadBytes(ref, data, metadata);
      } catch (error) {
        attempts++;
        console.warn(`Upload attempt ${attempts} failed:`, error);

        if (attempts >= maxAttempts) {
          console.error("Max upload attempts reached, failing", error);
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempts))
        );
      }
    }
  };
};

/**
 * Debug script for image upload issues
 * Run this to diagnose image upload problems
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the current directory and navigate to parent to find .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Load environment variables from the project root
dotenv.config({ path: join(projectRoot, ".env.local") });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function debugImageUpload() {
  console.log("🔍 Starting image upload diagnostics...\n");

  // 1. Check Firebase configuration
  console.log("1️⃣ Checking Firebase Configuration:");
  console.log(
    "   ✅ API Key:",
    firebaseConfig.apiKey ? "✓ Present" : "❌ Missing"
  );
  console.log(
    "   ✅ Auth Domain:",
    firebaseConfig.authDomain ? "✓ Present" : "❌ Missing"
  );
  console.log(
    "   ✅ Project ID:",
    firebaseConfig.projectId ? "✓ Present" : "❌ Missing"
  );
  console.log(
    "   ✅ Storage Bucket:",
    firebaseConfig.storageBucket ? "✓ Present" : "❌ Missing"
  );
  console.log();

  if (!firebaseConfig.storageBucket) {
    console.log(
      "❌ CRITICAL: Storage bucket is missing. Image uploads will not work."
    );
    console.log("🔧 Check your .env.local file in the project root.");
    return;
  }

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const storage = getStorage(app);
    const firestore = getFirestore(app);

    console.log("2️⃣ Firebase Services:");
    console.log("   ✅ Firebase App initialized");
    console.log("   ✅ Auth service available");
    console.log("   ✅ Storage service available");
    console.log("   ✅ Firestore service available");
    console.log();

    // 3. Test storage access
    console.log("3️⃣ Testing Storage Access:");
    try {
      // Create a test file
      const testContent = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const testRef = ref(storage, `test/connectivity-test-${Date.now()}.txt`);

      console.log("   📁 Attempting to upload test file...");
      await uploadBytes(testRef, testContent);

      console.log("   📥 Attempting to get download URL...");
      const downloadURL = await getDownloadURL(testRef);

      console.log("   ✅ Storage connectivity test PASSED");
      console.log("   🔗 Test file URL:", downloadURL);
      console.log();
    } catch (storageError) {
      console.log("   ❌ Storage connectivity test FAILED");
      console.log("   📋 Error:", storageError.message);
      console.log("   🔍 Error code:", storageError.code);

      if (storageError.code === "storage/unauthorized") {
        console.log("\n   💡 SOLUTION: Check your Firebase Storage rules:");
        console.log("      - Go to Firebase Console > Storage > Rules");
        console.log(
          "      - Ensure authenticated users can read/write to their folders"
        );
        console.log(
          "      - Example rule: allow read, write: if request.auth != null;"
        );
      }
      console.log();
    }

    // 4. Check Firestore access
    console.log("4️⃣ Testing Firestore Access:");
    try {
      const testDocRef = doc(firestore, "test", "connectivity");
      await updateDoc(testDocRef, {
        lastTest: new Date().toISOString(),
        testType: "image-upload-debug",
      });
      console.log("   ✅ Firestore write test PASSED");
    } catch (firestoreError) {
      console.log("   ❌ Firestore write test FAILED");
      console.log("   📋 Error:", firestoreError.message);
      console.log("   🔍 Error code:", firestoreError.code);

      if (firestoreError.code === "permission-denied") {
        console.log("\n   💡 SOLUTION: Check your Firestore rules:");
        console.log("      - Go to Firebase Console > Firestore > Rules");
        console.log(
          "      - Ensure authenticated users can write to 'users' collection"
        );
      }
    }
    console.log();

    // 5. Check user authentication flow
    console.log("5️⃣ Authentication Check:");
    if (auth.currentUser) {
      console.log("   ✅ User is authenticated:", auth.currentUser.uid);
      console.log("   📧 Email:", auth.currentUser.email);
      console.log(
        "   🖼️  Current photoURL:",
        auth.currentUser.photoURL || "Not set"
      );

      // Test user document access
      try {
        const userDocRef = doc(firestore, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          console.log("   ✅ User document exists in Firestore");
          const userData = userDoc.data();
          console.log(
            "   🖼️  Profile image URL:",
            userData.profileImageUrl || "Not set"
          );
          console.log(
            "   🖼️  Banner image URL:",
            userData.profileBannerUrl || "Not set"
          );
        } else {
          console.log("   ⚠️  User document does not exist in Firestore");
          console.log("   💡 This might be why images aren't saving properly");
        }
      } catch (userDocError) {
        console.log("   ❌ Cannot access user document:", userDocError.message);
      }
    } else {
      console.log("   ⚠️  No user currently authenticated");
      console.log("   💡 Image uploads require authentication");
      console.log(
        "   💡 Run this script while logged into your app for full testing"
      );
    }
    console.log();

    // 6. Check environment variables for server-side upload
    console.log("6️⃣ Server-side Configuration:");
    const hasServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log(
      "   📋 Service Account:",
      hasServiceAccount ? "✓ Present" : "❌ Missing"
    );

    if (!hasServiceAccount) {
      console.log("\n   💡 SOLUTION for missing service account:");
      console.log(
        "      1. Go to Firebase Console > Project Settings > Service Accounts"
      );
      console.log("      2. Generate new private key");
      console.log("      3. Download the JSON file");
      console.log(
        "      4. Convert to base64: cat service-account.json | base64 | tr -d '\\n'"
      );
      console.log(
        "      5. Add to .env.local: FIREBASE_SERVICE_ACCOUNT=<base64-string>"
      );
    }
    console.log();

    console.log("✅ Diagnostics complete!");
    console.log("\n🔧 Recommended next steps:");
    console.log("   1. Fix any configuration issues identified above");
    console.log(
      "   2. Ensure Firebase Storage rules allow authenticated uploads"
    );
    console.log("   3. Verify Firestore rules allow user document updates");
    console.log("   4. Test image upload in the application");
  } catch (error) {
    console.error("❌ Critical error during diagnostics:", error.message);
  }
}

// Run the diagnostics
debugImageUpload().catch(console.error);

/**
 * Migration script to add profile image and banner fields to existing user documents
 */

// Load environment variables
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "fs/promises";

// Load environment variables
dotenv.config();

async function run() {
  try {
    // Load service account from file
    const serviceAccountJson = await readFile(
      new URL("../service-account.json", import.meta.url),
      "utf8"
    );
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Initialize Firebase Admin SDK
    const app = initializeApp({
      credential: cert(serviceAccount),
    });

    // Get Firestore instance
    const db = getFirestore(app);

    await migrateUsers(db);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    process.exit(1);
  }
}

async function migrateUsers(db) {
  try {
    console.log("Starting user migration for profile images...");

    // Get all users
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("No users found to migrate");
      return;
    }

    console.log(`Found ${usersSnapshot.size} users to potentially update`);

    let batch = db.batch();
    let updatedCount = 0;

    // Process each user
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      let needsUpdate = false;
      const updates = {};

      // Check if profile image fields are missing
      if (userData.profileImageUrl === undefined) {
        updates.profileImageUrl = null;
        needsUpdate = true;
      }

      if (userData.profileBannerUrl === undefined) {
        updates.profileBannerUrl = null;
        needsUpdate = true;
      }

      if (userData.defaultProfileImageUrl === undefined) {
        updates.defaultProfileImageUrl = null;
        needsUpdate = true;
      }

      if (userData.defaultProfileBannerUrl === undefined) {
        updates.defaultProfileBannerUrl = null;
        needsUpdate = true;
      }

      // Update the document if needed
      if (needsUpdate) {
        batch.update(doc.ref, updates);
        updatedCount++;

        // Firestore limits batches to 500 operations
        if (updatedCount % 450 === 0) {
          await batch.commit();
          console.log(`Committed batch of ${updatedCount} updates so far...`);
          batch = db.batch(); // Create a new batch
        }
      }
    }

    // Commit any remaining updates
    if (updatedCount % 450 !== 0 && updatedCount > 0) {
      await batch.commit();
    }

    console.log(`Successfully migrated ${updatedCount} user documents`);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
run()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

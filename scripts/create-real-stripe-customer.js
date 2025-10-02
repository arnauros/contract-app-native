/**
 * Script to create a real Stripe customer for testing
 * This will replace the mock customer with a real one
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

async function createRealStripeCustomer() {
  try {
    console.log("🔐 Signing in to Firebase...");

    // You'll need to replace these with your actual credentials
    const email = "arnauros22@gmail.com"; // Replace with your email
    const password = "your-password"; // Replace with your password

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    console.log("✅ Signed in as:", user.email);

    // Get user document
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    console.log("📄 Current user data:", {
      email: userData.email,
      stripeCustomerId: userData.stripeCustomerId,
      subscription: userData.subscription,
    });

    // Create a real Stripe customer
    console.log("💳 Creating real Stripe customer...");
    const customer = await stripe.customers.create({
      email: user.email,
      name: userData.displayName || user.email,
      metadata: {
        firebase_uid: user.uid,
        source: "script_migration",
      },
    });

    console.log("✅ Created Stripe customer:", customer.id);

    // Update user document with real customer ID
    console.log("📝 Updating user document...");
    await updateDoc(doc(db, "users", user.uid), {
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    });

    console.log(
      "🎉 Success! User now has real Stripe customer ID:",
      customer.id
    );
    console.log("🔗 You can now use the real Stripe customer portal");

    // Sign out
    await auth.signOut();
    console.log("👋 Signed out");
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.code === "auth/user-not-found") {
      console.log(
        "💡 Make sure you have an account with the email you specified"
      );
    } else if (error.code === "auth/wrong-password") {
      console.log("💡 Check your password");
    } else if (error.code === "auth/invalid-email") {
      console.log("💡 Check your email format");
    }
  }
}

// Run the script
createRealStripeCustomer();

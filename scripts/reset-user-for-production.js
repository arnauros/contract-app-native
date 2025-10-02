/**
 * Script to reset user for production Stripe integration
 * Run this in the browser console while logged in to your app
 */

// Copy and paste this entire script into your browser console while on your app

async function resetUserForProduction() {
  try {
    console.log("🔐 Getting current user...");

    // Get current user from Firebase
    const { getAuth } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    const { getFirestore, doc, getDoc, deleteDoc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    const auth = getAuth();
    const db = getFirestore();

    if (!auth.currentUser) {
      throw new Error("No user logged in");
    }

    const user = auth.currentUser;
    console.log("✅ Current user:", user.email);

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

    // Delete the current user document
    console.log("🗑️ Deleting current user document...");
    await deleteDoc(doc(db, "users", user.uid));
    console.log("✅ User document deleted");

    // Create a new user document with clean data
    console.log("📝 Creating new user document...");
    const newUserData = {
      email: user.email,
      displayName: userData.displayName || user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      subscription: {
        tier: "free",
        status: "inactive",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        customerId: null,
        subscriptionId: null,
      },
      tutorialState: {
        isCompleted: false,
        stepsCompleted: 0,
      },
      // No stripeCustomerId - will be created when needed
    };

    await setDoc(doc(db, "users", user.uid), newUserData);
    console.log("✅ New user document created");

    // Create a real Stripe customer
    console.log("💳 Creating real Stripe customer...");
    const response = await fetch("/api/stripe/create-customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
        name: userData.displayName || user.email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create customer");
    }

    const { customerId } = await response.json();
    console.log("✅ Created real Stripe customer:", customerId);

    // Update user document with the new customer ID
    console.log("📝 Updating user document with new customer ID...");
    await setDoc(
      doc(db, "users", user.uid),
      {
        ...newUserData,
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    console.log("✅ User document updated with new customer ID");

    // Test the customer portal
    console.log("🧪 Testing customer portal...");
    const portalResponse = await fetch("/api/stripe/create-portal-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.uid,
        stripeCustomerId: customerId,
      }),
    });

    if (portalResponse.ok) {
      const { url } = await portalResponse.json();
      console.log("✅ Customer portal URL created successfully:", url);
      console.log(
        "🎉 Success! User reset for production with real Stripe integration"
      );

      // Show success message
      alert(
        `✅ User reset successfully!\n\nNew Stripe Customer ID: ${customerId}\n\nCustomer Portal URL: ${url}\n\nClick OK to open the portal.`
      );

      // Open the portal in a new tab
      window.open(url, "_blank");
    } else {
      const errorData = await portalResponse.json();
      console.error("❌ Customer portal test failed:", errorData);
      throw new Error(`Portal test failed: ${errorData.error}`);
    }

    // Reload the page to refresh the UI
    console.log("🔄 Reloading page to refresh UI...");
    setTimeout(() => {
      window.location.reload();
    }, 3000);

    return customerId;
  } catch (error) {
    console.error("❌ Error:", error.message);
    alert("Error resetting user: " + error.message);
  }
}

// Run the function
console.log("🚀 Starting user reset for production...");
resetUserForProduction();

/**
 * Script to fix Stripe customer issue
 * Run this in the browser console while logged in to your app
 */

// Copy and paste this entire script into your browser console while on your app

async function fixStripeCustomer() {
  try {
    console.log("🔐 Getting current user...");

    // Get current user from Firebase
    const { getAuth } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    const { getFirestore, doc, getDoc, updateDoc } = await import(
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

    // Create a new real Stripe customer
    console.log("💳 Creating new Stripe customer...");
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
    console.log("✅ Created new Stripe customer:", customerId);

    // Test the customer portal with the new customer
    console.log("🧪 Testing customer portal with new customer...");
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
        "🎉 Success! You can now use the real Stripe customer portal"
      );

      // Show the URL in an alert for easy access
      alert(
        `Stripe Customer Portal URL:\n${url}\n\nClick OK to open it in a new tab.`
      );

      // Open the portal in a new tab
      window.open(url, "_blank");
    } else {
      const errorData = await portalResponse.json();
      console.error("❌ Customer portal test failed:", errorData);
      throw new Error(`Portal test failed: ${errorData.error}`);
    }

    return customerId;
  } catch (error) {
    console.error("❌ Error:", error.message);
    alert("Error fixing Stripe customer: " + error.message);
  }
}

// Run the function
console.log("🚀 Starting Stripe customer fix...");
fixStripeCustomer();

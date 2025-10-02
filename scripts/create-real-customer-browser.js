/**
 * Browser script to create a real Stripe customer
 * Run this in the browser console while logged in to your app
 */

// Copy and paste this entire script into your browser console while on your app

async function createRealStripeCustomer() {
  try {
    console.log("🔐 Getting current user...");

    // Get current user from Firebase
    const { getAuth } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    const { getFirestore, doc, getDoc } = await import(
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

    // Check if user already has a real Stripe customer
    if (
      userData.stripeCustomerId &&
      !userData.stripeCustomerId.startsWith("mock_")
    ) {
      console.log(
        "✅ User already has a real Stripe customer:",
        userData.stripeCustomerId
      );
      return userData.stripeCustomerId;
    }

    // Create a real Stripe customer via API
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
    console.log("✅ Created Stripe customer:", customerId);

    console.log(
      "🎉 Success! User now has real Stripe customer ID:",
      customerId
    );
    console.log("🔗 You can now use the real Stripe customer portal");

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
      console.log("✅ Customer portal URL created:", url);
      console.log("🔗 You can now access the real Stripe customer portal");
    } else {
      const errorData = await portalResponse.json();
      console.warn("⚠️ Customer portal test failed:", errorData.error);
    }

    // Reload the page to refresh the UI
    console.log("🔄 Reloading page to refresh UI...");
    setTimeout(() => {
      window.location.reload();
    }, 2000);

    return customerId;
  } catch (error) {
    console.error("❌ Error:", error.message);
    alert("Error creating Stripe customer: " + error.message);
  }
}

// Run the function
console.log("🚀 Starting real Stripe customer creation...");
createRealStripeCustomer();

// Run this in the browser console to reset tutorial state
// Copy and paste this entire script into your browser's developer console

(async function resetTutorial() {
  try {
    // Get current user ID from localStorage
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("No user ID found in localStorage");
      console.log("Available localStorage keys:", Object.keys(localStorage));
      return;
    }

    console.log("Resetting tutorial for user:", userId);

    // Import Firebase (assuming it's available globally)
    if (typeof window !== "undefined" && window.firebase) {
      const { doc, updateDoc, getDoc } = window.firebase.firestore;
      const db = window.firebase.firestore();

      // Get current user document
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error("User document not found");
        return;
      }

      const userData = userDoc.data();
      console.log("Current tutorial state:", userData.tutorialState);

      // Reset tutorial state to null to force re-initialization
      await updateDoc(userRef, {
        tutorialState: null,
        updatedAt: new Date(),
      });

      console.log("✅ Tutorial state reset successfully");
      console.log("Please refresh the page to see the new tutorial steps");
    } else {
      console.error(
        "Firebase not available. Please run this in the browser console on your app."
      );
    }
  } catch (error) {
    console.error("Error resetting tutorial:", error);
  }
})();

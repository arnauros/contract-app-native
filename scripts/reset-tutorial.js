// Reset tutorial state for current user
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGsX27lCpZB1V4mMpCjE2R4OUfuIGwLuQ",
  authDomain: "freelance-project-3d0b5.firebaseapp.com",
  projectId: "freelance-project-3d0b5",
  storageBucket: "freelance-project-3d0b5.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetTutorial() {
  try {
    // Get current user ID from localStorage (set by the app)
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("No user ID found in localStorage");
      return;
    }

    console.log("Resetting tutorial for user:", userId);

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
  } catch (error) {
    console.error("Error resetting tutorial:", error);
  }
}

// Run the reset
resetTutorial();

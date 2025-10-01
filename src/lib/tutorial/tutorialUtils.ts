import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { TutorialState, TutorialStep } from "./types";
import { TUTORIAL_CONFIG } from "./config";

export async function initializeTutorialForUser(
  userId: string
): Promise<TutorialState> {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingTutorial = userData.tutorialState;

      if (existingTutorial) {
        // Return existing tutorial state
        return existingTutorial as TutorialState;
      }
    }

    // Create new tutorial state
    const newTutorialState: TutorialState = {
      isActive: false,
      isCompleted: false,
      steps: TUTORIAL_CONFIG.steps.map((step) => ({
        ...step,
        completed: false,
      })),
      startedAt: new Date(),
    };

    // Store in user document
    await updateDoc(userRef, {
      tutorialState: newTutorialState,
    });

    return newTutorialState;
  } catch (error) {
    console.error("Error initializing tutorial:", error);
    throw error;
  }
}

export async function startTutorial(userId: string): Promise<void> {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    "tutorialState.isActive": true,
    "tutorialState.startedAt": new Date(),
  });
}

export async function completeTutorialStep(
  userId: string,
  stepId: string
): Promise<void> {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const tutorialData = userData.tutorialState as TutorialState;

    if (!tutorialData) {
      throw new Error("Tutorial not found");
    }

    const updatedSteps = tutorialData.steps.map((step) =>
      step.id === stepId ? { ...step, completed: true } : step
    );

    // Check if all steps are completed
    const allCompleted = updatedSteps.every((step) => step.completed);

    await updateDoc(userRef, {
      "tutorialState.steps": updatedSteps,
      "tutorialState.isCompleted": allCompleted,
      "tutorialState.completedAt": allCompleted ? new Date() : undefined,
    });
  } catch (error) {
    console.error("Error completing tutorial step:", error);
    throw error;
  }
}

export async function getTutorialState(
  userId: string
): Promise<TutorialState | null> {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return (userData.tutorialState as TutorialState) || null;
  } catch (error) {
    console.error("Error getting tutorial state:", error);
    return null;
  }
}

export async function dismissTutorial(userId: string): Promise<void> {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    "tutorialState.isActive": false,
  });
}

export function shouldShowTutorial(
  tutorialState: TutorialState | null
): boolean {
  if (!tutorialState) return true; // New user
  if (tutorialState.isCompleted) return false; // Already completed
  if (!tutorialState.isActive) return false; // User dismissed it

  return true;
}

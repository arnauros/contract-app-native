import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { TutorialState } from "@/lib/tutorial/types";
import {
  initializeTutorialForUser,
  getTutorialState,
  startTutorial,
  shouldShowTutorial,
  completeTutorialStep,
} from "@/lib/tutorial/tutorialUtils";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

export function useTutorial() {
  const { user, loading: authLoading } = useAuth();
  const [tutorialState, setTutorialState] = useState<TutorialState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Initialize tutorial state when user loads
  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(false);
      return;
    }

    const db = getFirestore();
    const userRef = doc(db, "users", user.uid);

    // Set up real-time listener for user document changes
    const unsubscribe = onSnapshot(userRef, async (doc) => {
      try {
        setIsLoading(true);

        if (doc.exists()) {
          const userData = doc.data();
          const tutorialState = userData.tutorialState as TutorialState;

          console.log(
            "🎯 Tutorial: User doc exists, tutorial state:",
            tutorialState
          );

          if (tutorialState && tutorialState.steps) {
            setTutorialState(tutorialState);
            console.log("🎯 Tutorial: Set existing tutorial state:", {
              isActive: tutorialState.isActive,
              isCompleted: tutorialState.isCompleted,
              stepsCompleted: tutorialState.steps.filter((s) => s.completed)
                .length,
            });
          } else {
            // Initialize tutorial if it doesn't exist
            console.log(
              "🎯 Tutorial: No tutorial state found, initializing..."
            );
            const state = await initializeTutorialForUser(user.uid);
            setTutorialState(state);
            console.log("🎯 Tutorial: Initialized new tutorial state:", {
              isActive: state.isActive,
              isCompleted: state.isCompleted,
            });
          }
        } else {
          // User document doesn't exist, initialize tutorial
          console.log("🎯 Tutorial: User doc doesn't exist, initializing...");
          const state = await initializeTutorialForUser(user.uid);
          setTutorialState(state);
          console.log("🎯 Tutorial: Initialized new tutorial state:", {
            isActive: state.isActive,
            isCompleted: state.isCompleted,
          });
        }
      } catch (error) {
        console.error("Failed to initialize tutorial:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Start tutorial if it should be shown
  const startTutorialIfNeeded = useCallback(async () => {
    if (!user || !tutorialState) return;

    if (shouldShowTutorial(tutorialState) && !tutorialState.isActive) {
      try {
        await startTutorial(user.uid);
        setTutorialState((prev) => (prev ? { ...prev, isActive: true } : null));
      } catch (error) {
        console.error("Failed to start tutorial:", error);
      }
    }
  }, [user, tutorialState]);

  // Auto-start tutorial for new users
  useEffect(() => {
    if (
      tutorialState &&
      !tutorialState.isCompleted &&
      !tutorialState.isActive
    ) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        startTutorialIfNeeded();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [tutorialState, startTutorialIfNeeded]);

  const updateTutorialState = useCallback((newState: TutorialState) => {
    setTutorialState(newState);
  }, []);

  // Auto-complete tutorial steps based on user actions
  const trackAction = useCallback(
    (action: string) => {
      if (!user || !tutorialState) return;

      const actionToStepMap: Record<string, string> = {
        contract_created: "create_contract",
        contract_sent: "send_contract",
        invoice_created: "create_invoice",
        invoice_sent: "send_invoice",
        profile_updated: "customize_profile",
        payment_setup: "setup_payments",
        settings_viewed: "explore_settings",
      };

      const stepId = actionToStepMap[action];
      if (
        stepId &&
        !tutorialState.steps.find((s) => s.id === stepId)?.completed
      ) {
        completeTutorialStep(user.uid, stepId);
      }
    },
    [user, tutorialState]
  );

  const shouldShow = tutorialState ? shouldShowTutorial(tutorialState) : false;

  // Debug logging (commented out for production)
  // console.log("🎯 Tutorial: shouldShow calculation:", {
  //   hasTutorialState: !!tutorialState,
  //   shouldShow,
  //   tutorialState: tutorialState
  //     ? {
  //         isActive: tutorialState.isActive,
  //         isCompleted: tutorialState.isCompleted,
  //       }
  //     : null,
  // });

  return {
    tutorialState,
    isLoading,
    shouldShow,
    updateTutorialState,
    startTutorialIfNeeded,
    trackAction,
  };
}

// Hook to track user actions for tutorial completion
export function useTutorialActions() {
  const { user } = useAuth();
  const [actionHistory, setActionHistory] = useState<string[]>([]);

  const trackAction = useCallback(
    (action: string) => {
      if (!user) return;

      setActionHistory((prev) => {
        const newHistory = [...prev, action];
        // Keep only last 10 actions
        return newHistory.slice(-10);
      });
    },
    [user]
  );

  const hasPerformedAction = useCallback(
    (action: string) => {
      return actionHistory.includes(action);
    },
    [actionHistory]
  );

  return {
    trackAction,
    hasPerformedAction,
    actionHistory,
  };
}

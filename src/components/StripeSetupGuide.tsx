"use client";

import React, { useState } from "react";
import { TutorialState, TutorialStep } from "@/lib/tutorial/types";
import {
  completeTutorialStep,
  dismissTutorial,
} from "@/lib/tutorial/tutorialUtils";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiMaximize2,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface StripeSetupGuideProps {
  tutorialState: TutorialState | null;
  onStateChange: (newState: TutorialState) => void;
}

export default function StripeSetupGuide({
  tutorialState,
  onStateChange,
}: StripeSetupGuideProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [animatingStep, setAnimatingStep] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["go_live"])
  );

  const completedSteps =
    tutorialState?.steps?.filter((step) => step.completed).length || 0;
  const totalSteps = tutorialState?.steps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleStepClick = async (step: TutorialStep) => {
    if (step.completed || !user) return;

    try {
      await completeTutorialStep(user.uid, step.id);

      // Update local state
      const updatedSteps =
        tutorialState?.steps?.map((s) =>
          s.id === step.id ? { ...s, completed: true } : s
        ) || [];

      const updatedState: TutorialState = {
        ...tutorialState!,
        steps: updatedSteps,
        isCompleted: updatedSteps.every((s) => s.completed),
      };

      onStateChange(updatedState);

      // Trigger completion animation
      setAnimatingStep(step.id);

      // Show completion toast
      if (step.id === "complete") {
        toast.success("Setup complete! You're ready to go!", {
          duration: 4000,
          style: {
            background: "linear-gradient(135deg, #635BFF, #5A52FF)",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(99, 91, 255, 0.3)",
          },
        });
      } else {
        toast.success(`${step.title} completed!`, {
          duration: 2500,
          style: {
            background: "linear-gradient(135deg, #635BFF, #5A52FF)",
            color: "white",
            fontSize: "14px",
            fontWeight: "500",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(99, 91, 255, 0.2)",
          },
        });
      }

      // Reset animation after delay
      setTimeout(() => setAnimatingStep(null), 1000);
    } catch (error) {
      console.error("Error completing tutorial step:", error);
      toast.error("Failed to complete step. Please try again.");
    }
  };

  const handleDismiss = async () => {
    if (!user) return;

    try {
      await dismissTutorial(user.uid);
      const updatedState = {
        ...tutorialState!,
        isActive: false,
        isDismissed: true,
      };
      onStateChange(updatedState);
    } catch (error) {
      console.error("Error dismissing tutorial:", error);
      toast.error("Failed to dismiss setup guide.");
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (!tutorialState) {
    return null;
  }

  // If dismissed, don't show the floating component
  if (tutorialState.isDismissed) {
    return null;
  }

  // If not active, don't show
  if (!tutorialState.isActive) {
    return null;
  }

  // Group steps into sections
  const mainSteps =
    tutorialState.steps?.filter((step) => !["complete"].includes(step.id)) ||
    [];
  const goLiveSteps =
    tutorialState.steps?.filter((step) =>
      ["send_contract", "send_invoice", "explore_settings"].includes(step.id)
    ) || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20, y: 20 }}
      className={`fixed bottom-6 right-6 z-[99999] bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? "max-w-xs" : "max-w-md"
      }`}
      style={{
        position: "fixed",
        zIndex: 99999,
        isolation: "isolate",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900 text-base">Setup guide</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title={isMinimized ? "Expand guide" : "Minimize guide"}
          >
            <FiMaximize2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Dismiss guide"
          >
            <FiX className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-[#635BFF] h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Steps List */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {/* Main Steps */}
              {mainSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2"
                  onClick={() => handleStepClick(step)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            delay: 0.1,
                          }}
                          className="w-5 h-5 bg-[#635BFF] rounded-full flex items-center justify-center"
                        >
                          <FiCheck className="w-3 h-3 text-white" />
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-[#635BFF] rounded-full" />
                      )}
                    </div>
                    <span className="text-sm text-gray-900 font-medium">
                      {step.title}
                    </span>
                  </div>
                  <FiChevronDown className="w-4 h-4 text-gray-400" />
                </motion.div>
              ))}

              {/* Go Live Section */}
              <div className="pt-2">
                <div
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2"
                  onClick={() => toggleSection("go_live")}
                >
                  <span className="text-sm text-gray-900 font-medium">
                    Go live
                  </span>
                  {expandedSections.has("go_live") ? (
                    <FiChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedSections.has("go_live") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 space-y-2 pt-2">
                        {goLiveSteps.map((step, index) => (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-3 py-1 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2"
                            onClick={() => handleStepClick(step)}
                          >
                            <div className="flex-shrink-0">
                              {step.completed ? (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                    delay: 0.1,
                                  }}
                                  className="w-4 h-4 bg-[#635BFF] rounded-full flex items-center justify-center"
                                >
                                  <FiCheck className="w-2.5 h-2.5 text-white" />
                                </motion.div>
                              ) : (
                                <div className="w-4 h-4 border-2 border-[#635BFF] rounded-full" />
                              )}
                            </div>
                            <span className="text-sm text-gray-700">
                              {step.title}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Celebration */}
      {tutorialState.isCompleted && !isMinimized && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="px-4 py-3 bg-gradient-to-r from-[#635BFF] to-[#5A52FF] text-white text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold text-sm">
              All set! You're ready to go live.
            </span>
          </div>
        </motion.div>
      )}

      {/* Minimized State - Just progress indicator */}
      {isMinimized && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-center">
            {/* Progress Ring */}
            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#635BFF"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

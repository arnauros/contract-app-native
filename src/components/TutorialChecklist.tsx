"use client";

import React, { useState, useEffect } from "react";
import { TutorialState, TutorialStep } from "@/lib/tutorial/types";
import {
  completeTutorialStep,
  dismissTutorial,
} from "@/lib/tutorial/tutorialUtils";
import { useAuth } from "@/lib/hooks/useAuth";
import { FiCheck, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface TutorialChecklistProps {
  tutorialState: TutorialState | null;
  onStateChange: (newState: TutorialState) => void;
}

export default function TutorialChecklist({
  tutorialState,
  onStateChange,
}: TutorialChecklistProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [animatingStep, setAnimatingStep] = useState<string | null>(null);

  const completedSteps =
    tutorialState?.steps.filter((step) => step.completed).length || 0;
  const totalSteps = tutorialState?.steps.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleStepClick = async (step: TutorialStep) => {
    if (step.completed || !user) return;

    try {
      await completeTutorialStep(user.uid, step.id);

      // Update local state
      const updatedSteps =
        tutorialState?.steps.map((s) =>
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
        toast.success("Tutorial completed! You're ready to go!", {
          duration: 4000,
          style: {
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
          },
        });
      } else {
        toast.success(`${step.title} completed!`, {
          duration: 2500,
          style: {
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "white",
            fontSize: "14px",
            fontWeight: "500",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
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
    if (!user || !tutorialState?.isCompleted) return;

    try {
      await dismissTutorial(user.uid);
      const updatedState = { ...tutorialState!, isActive: false };
      onStateChange(updatedState);
      toast("Tutorial dismissed. You can always restart it from settings.", {
        icon: "ℹ️",
      });
    } catch (error) {
      console.error("Error dismissing tutorial:", error);
      toast.error("Failed to dismiss tutorial.");
    }
  };

  if (!tutorialState || !tutorialState.isActive) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20, y: 20 }}
      className={`fixed bottom-6 right-6 z-[99999] bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? "max-w-xs" : "max-w-sm"
      }`}
      style={{
        position: "fixed",
        zIndex: 99999,
        isolation: "isolate",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {completedSteps}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Getting Started
            </h3>
            <p className="text-xs text-gray-500">
              {completedSteps}/{totalSteps} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isMinimized ? "Expand tutorial" : "Minimize tutorial"}
          >
            {isMinimized ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
          </button>
          {tutorialState.isCompleted && (
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Dismiss tutorial"
            >
              <FiX className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-3 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
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
            <div className="px-3 pb-3 space-y-2">
              {tutorialState.steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                    step.completed
                      ? "bg-green-50 border border-green-200"
                      : "hover:bg-gray-50 border border-transparent"
                  } ${
                    animatingStep === step.id
                      ? "ring-2 ring-green-400 ring-opacity-50"
                      : ""
                  }`}
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
                        className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <FiCheck className="w-4 h-4 text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500"
                        whileHover={{ scale: 1.1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        <span className="text-xs font-medium">
                          {step.order}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{step.icon}</span>
                      <h4
                        className={`text-sm font-medium ${
                          step.completed ? "text-green-700" : "text-gray-900"
                        }`}
                      >
                        {step.title}
                      </h4>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        step.completed ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>

                  {animatingStep === step.id && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 bg-green-100 bg-opacity-50 rounded-lg"
                    />
                  )}
                </motion.div>
              ))}
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
          className="px-3 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold text-sm">All done! Great job!</span>
          </div>
        </motion.div>
      )}

      {/* Minimized State Indicator */}
      {isMinimized && (
        <div className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {completedSteps}
            </div>
            <span className="text-sm text-gray-600">
              {tutorialState.isCompleted
                ? "Complete!"
                : `${completedSteps}/${totalSteps}`}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

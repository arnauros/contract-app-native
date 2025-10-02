"use client";

import React from "react";
import { TutorialState } from "@/lib/tutorial/types";
import { motion } from "framer-motion";

interface SetupGuidePillProps {
  tutorialState: TutorialState | null;
  onReopen: () => void;
}

export default function SetupGuidePill({
  tutorialState,
  onReopen,
}: SetupGuidePillProps) {
  if (!tutorialState || !tutorialState.isDismissed) {
    return null;
  }

  const completedSteps =
    tutorialState?.steps?.filter((step) => step.completed).length || 0;
  const totalSteps = tutorialState?.steps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onReopen}
      className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-2 transition-colors"
    >
      {/* Add Icon */}
      <div className="w-6 h-6 bg-[#635BFF] rounded-full flex items-center justify-center">
        <span className="text-white text-sm font-bold">+</span>
      </div>

      {/* Setup Guide Text */}
      <span className="text-sm text-gray-700 font-medium">Setup guide</span>

      {/* Progress Ring */}
      <div className="relative w-4 h-4">
        <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 16 16">
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="#E5E7EB"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="#635BFF"
            strokeWidth="2"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 6}`}
            strokeDashoffset={`${2 * Math.PI * 6 * (1 - progress / 100)}`}
            className="transition-all duration-300"
          />
        </svg>
      </div>
    </motion.button>
  );
}

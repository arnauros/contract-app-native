import React from "react";

interface ProgressIndicatorProps {
  steps: number;
  currentStep: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        Step {currentStep} of {steps}
      </span>
      <div className="flex gap-2">
        {[...Array(steps)].map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index + 1 === currentStep ? "bg-gray-800" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;

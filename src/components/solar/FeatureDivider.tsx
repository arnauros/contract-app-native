"use client";

interface FeatureDividerProps {
  className?: string;
}

export default function FeatureDivider({
  className = "",
}: FeatureDividerProps) {
  return (
    <div className={`mx-auto flex items-center justify-center ${className}`}>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
    </div>
  );
}

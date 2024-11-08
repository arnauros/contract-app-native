import React, { CSSProperties, ReactNode } from "react";

// Tooltip Props Interface
interface TooltipProps {
  text: string; // Text to display in the tooltip
  color?: string; // Text color class for the tooltip
  backgroundColor?: string; // Background color class for the tooltip
  position?: "top" | "bottom" | "left" | "right"; // Position of the tooltip relative to the children
  style?: CSSProperties; // Optional custom styles
  children: ReactNode; // The child element the tooltip wraps around
}

// Tooltip Component
const Tooltip: React.FC<TooltipProps> = ({
  text,
  color = "text-white",
  backgroundColor = "bg-gray-800",
  position = "top",
  style,
  children,
}) => {
  // Position-based classes for the tooltip
  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  };

  const words = text.split(" ");
  const truncatedText =
    words.length > 15 ? words.slice(0, 15).join(" ") + "..." : text;

  return (
    <div className="relative inline-flex items-center group">
      <div className="pt-1.5">
        {children}
        <div
          className={`absolute z-10 px-3 py-1 text-sm font-semibold rounded-md opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none ${backgroundColor} ${color} ${positionClasses[position]}`}
          style={{
            ...style,
            whiteSpace: "normal", // Allows text to wrap
            overflow: "hidden", // Ensures text doesn't overflow
            display: "-webkit-box", // Required for line clamping
            WebkitLineClamp: 2, // Limits to two lines
            WebkitBoxOrient: "vertical", // Required for line clamping
            textOverflow: "ellipsis", // Adds ellipsis if text is too long
            maxWidth: "300px", // Sets a maximum width for the tooltip
          }}
        >
          {truncatedText}
        </div>
      </div>
    </div>
  );
};

export default Tooltip;

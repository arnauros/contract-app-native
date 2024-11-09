import React from "react";

interface ButtonProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
}

export default function Button({
  size = "md",
  children = "Button text",
  fullWidth = false,
  onClick,
}: ButtonProps) {
  const baseClasses =
    "inline-flex justify-center items-center gap-3 rounded-lg bg-[#323232] text-white hover:bg-[#454545] transition-all duration-200 ease-in-out shadow-sm hover:shadow-lg";
  const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-4 py-3 text-sm",
    xl: "px-4 py-3 text-sm",
  };
  const widthClass = fullWidth ? "w-full" : ""; // Apply full width if specified

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${
        sizeClasses[size as keyof typeof sizeClasses]
      } ${widthClass}`}
    >
      {children}
    </button>
  );
}

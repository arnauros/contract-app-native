import React from "react";

interface ButtonProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  className?: string;
}

export default function Button({
  size = "md",
  children = "Button text",
  fullWidth = false,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}: ButtonProps) {
  const baseClasses =
    "inline-flex justify-center items-center gap-3 rounded-lg bg-[#323232] hover:bg-[#454545] transition-all duration-200 ease-in-out shadow-sm hover:shadow-lg";
  const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-4 py-3 text-sm",
    xl: "px-4 py-3 text-sm",
  };
  const widthClass = fullWidth ? "w-full" : ""; // Apply full width if specified
  const variantClasses = {
    primary: "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500",
    secondary:
      "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
    outline:
      "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${
        sizeClasses[size as keyof typeof sizeClasses]
      } ${widthClass} ${
        variantClasses[variant as keyof typeof variantClasses]
      } ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

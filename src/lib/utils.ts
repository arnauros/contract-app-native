import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a date string using date-fns
export function formatDate(date: string | Date, formatString: string = "PPP") {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatString);
}

// Animation variants for framer-motion
export const fadeIn = (
  direction: "up" | "down" | "left" | "right" = "up",
  delay: number = 0.2
) => {
  return {
    hidden: {
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
      opacity: 0,
    },
    show: {
      y: 0,
      x: 0,
      opacity: 1,
      transition: {
        type: "tween",
        duration: 0.8,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    },
  };
};

// Staggered animation for lists
export const staggerContainer = (
  staggerChildren?: number,
  delayChildren?: number
) => {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
};

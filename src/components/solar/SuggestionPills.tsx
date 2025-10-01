"use client";

import { useState } from "react";

export interface SuggestionPill {
  id: string;
  text: string;
  emoji: string;
  color: string;
}

const suggestionPills: SuggestionPill[] = [
  {
    id: "website-redesign",
    text: "Website redesign with 3 revision rounds",
    emoji: "🌐",
    color: "blue",
  },
  {
    id: "mobile-app",
    text: "Mobile app MVP, $5k flat fee",
    emoji: "📱",
    color: "orange",
  },
  {
    id: "branding-package",
    text: "Branding package, 50% deposit upfront",
    emoji: "🎨",
    color: "green",
  },
  {
    id: "freelance-writing",
    text: "Freelance writing, $100/article",
    emoji: "✍️",
    color: "purple",
  },
  {
    id: "consulting-retainer",
    text: "Ongoing consulting retainer, $1k/mo",
    emoji: "💼",
    color: "pink",
  },
];

interface SuggestionPillsProps {
  onChipClick: (text: string, chipId: string) => void;
  selectedChip?: string | null;
  hideSuggestions?: boolean;
}

export function SuggestionPills({
  onChipClick,
  selectedChip = null,
  hideSuggestions = false,
}: SuggestionPillsProps) {
  if (hideSuggestions) return null;

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap = {
      blue: isSelected
        ? "bg-blue-100 border-blue-300 text-blue-700"
        : "bg-gray-50 hover:bg-gray-100 hover:scale-105 border-gray-200 text-gray-700",
      orange: isSelected
        ? "bg-orange-100 border-orange-300 text-orange-700"
        : "bg-gray-50 hover:bg-gray-100 hover:scale-105 border-gray-200 text-gray-700",
      green: isSelected
        ? "bg-green-100 border-green-300 text-green-700"
        : "bg-gray-50 hover:bg-gray-100 hover:scale-105 border-gray-200 text-gray-700",
      purple: isSelected
        ? "bg-purple-100 border-purple-300 text-purple-700"
        : "bg-gray-50 hover:bg-gray-100 hover:scale-105 border-gray-200 text-gray-700",
      pink: isSelected
        ? "bg-pink-100 border-pink-300 text-pink-700"
        : "bg-gray-50 hover:bg-gray-100 hover:scale-105 border-gray-200 text-gray-700",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="mt-8 overflow-hidden">
      {/* Seamless infinite scrolling pills */}
      <div className="flex gap-3 animate-scroll-left">
        {/* First set of buttons */}
        {suggestionPills.map((pill) => (
          <button
            key={pill.id}
            onClick={() => onChipClick(pill.text, pill.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200 border whitespace-nowrap ${
              selectedChip === pill.id ? "scale-105" : ""
            } ${getColorClasses(pill.color, selectedChip === pill.id)}`}
          >
            {pill.emoji} {pill.text}
          </button>
        ))}

        {/* Duplicate set for seamless loop */}
        {suggestionPills.map((pill) => (
          <button
            key={`duplicate-${pill.id}`}
            onClick={() => onChipClick(pill.text, pill.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200 border whitespace-nowrap ${
              selectedChip === pill.id ? "scale-105" : ""
            } ${getColorClasses(pill.color, selectedChip === pill.id)}`}
          >
            {pill.emoji} {pill.text}
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

export { suggestionPills };

"use client";

import React from "react";

export default function VerticalLines() {
  // Calculate number of lines based on viewport width
  const numberOfLines = 6;

  return (
    <div className="relative mx-auto flex w-full flex-1 justify-center">
      <div className="absolute inset-0 flex flex-row justify-between">
        {Array.from({ length: numberOfLines }).map((_, i) => (
          <div
            key={i}
            className="h-full w-px bg-gradient-to-b from-transparent via-gray-200/20 to-transparent"
          />
        ))}
      </div>
    </div>
  );
}

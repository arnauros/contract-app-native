"use client";

import React, { useState, useEffect } from "react";

interface TypeWriterProps {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBetweenTexts?: number;
  className?: string;
}

const TypeWriter: React.FC<TypeWriterProps> = ({
  texts,
  typingSpeed = 100,
  deletingSpeed = 50,
  delayBetweenTexts = 1500,
  className = "",
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    // Handle blinking cursor effect
    const blinkInterval = setInterval(() => {
      setIsBlinking((prev) => !prev);
    }, 500);

    // Handle typing logic
    if (!isDeleting && currentText.length < texts[currentTextIndex].length) {
      // Still typing the current text
      timeout = setTimeout(() => {
        setCurrentText(
          texts[currentTextIndex].substring(0, currentText.length + 1)
        );
      }, typingSpeed);
    } else if (isDeleting && currentText.length > 0) {
      // Deleting the current text
      timeout = setTimeout(() => {
        setCurrentText(
          texts[currentTextIndex].substring(0, currentText.length - 1)
        );
      }, deletingSpeed);
    } else if (
      !isDeleting &&
      currentText.length === texts[currentTextIndex].length
    ) {
      // Finished typing, wait before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, delayBetweenTexts);
    } else if (isDeleting && currentText.length === 0) {
      // Finished deleting, move to next text
      setIsDeleting(false);
      setCurrentTextIndex((currentTextIndex + 1) % texts.length);
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(blinkInterval);
    };
  }, [
    currentText,
    currentTextIndex,
    isDeleting,
    texts,
    typingSpeed,
    deletingSpeed,
    delayBetweenTexts,
  ]);

  return (
    <span className={className}>
      {currentText}
      <span
        className={`border-r-2 ml-1 ${
          isBlinking ? "border-transparent" : "border-current"
        }`}
      >
        &nbsp;
      </span>
    </span>
  );
};

export default TypeWriter;

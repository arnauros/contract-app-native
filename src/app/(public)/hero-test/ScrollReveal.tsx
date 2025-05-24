"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register the ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right" | "zoom-in";
  delay?: number;
  duration?: number;
  threshold?: number; // When to start the animation (0-1)
  once?: boolean; // Whether to play the animation only once
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  duration = 0.8,
  threshold = 0.2,
  once = true,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    let animationConfig = {};

    // Configure animation based on type
    switch (animation) {
      case "fade-up":
        animationConfig = {
          y: 50,
          opacity: 0,
        };
        break;
      case "fade-in":
        animationConfig = {
          opacity: 0,
        };
        break;
      case "slide-left":
        animationConfig = {
          x: 100,
          opacity: 0,
        };
        break;
      case "slide-right":
        animationConfig = {
          x: -100,
          opacity: 0,
        };
        break;
      case "zoom-in":
        animationConfig = {
          scale: 0.8,
          opacity: 0,
        };
        break;
      default:
        animationConfig = {
          y: 50,
          opacity: 0,
        };
    }

    // Set initial state
    gsap.set(element, animationConfig);

    // Create the scroll trigger animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: `top bottom-=${threshold * 100}%`,
        toggleActions: once
          ? "play none none none"
          : "play reverse play reverse",
        once: once,
      },
    });

    tl.to(element, {
      ...Object.fromEntries(
        Object.entries(animationConfig).map(([key, value]) => [
          key,
          typeof value === "number" ? 0 : 1,
        ])
      ),
      duration,
      delay,
      ease: "power3.out",
    });

    // Cleanup function
    return () => {
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  }, [animation, delay, duration, threshold, once]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
};

export default ScrollReveal;

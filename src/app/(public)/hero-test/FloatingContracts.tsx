"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface FloatingContractsProps {
  className?: string;
}

const FloatingContracts: React.FC<FloatingContractsProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const contracts =
      containerRef.current.querySelectorAll(".floating-contract");

    // Create a GSAP context for cleanup
    const ctx = gsap.context(() => {
      // Initial setup - position contracts randomly
      contracts.forEach((contract, index) => {
        // Initial random position
        gsap.set(contract, {
          x: Math.random() * 100 - 50,
          y: Math.random() * 100 - 50,
          rotation: Math.random() * 20 - 10,
          opacity: 0.8 + Math.random() * 0.2,
          scale: 0.8 + Math.random() * 0.4,
        });

        // Create floating animation
        gsap.to(contract, {
          y: `+=${Math.random() * 30 - 15}`,
          x: `+=${Math.random() * 30 - 15}`,
          rotation: `+=${Math.random() * 10 - 5}`,
          duration: 5 + Math.random() * 5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 2,
        });
      });
    });

    // Add mouse parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate mouse position relative to the center of the window
      const mouseXPercent = (clientX / windowWidth - 0.5) * 2; // -1 to 1
      const mouseYPercent = (clientY / windowHeight - 0.5) * 2; // -1 to 1

      contracts.forEach((contract, index) => {
        // Different parallax amount for each contract for depth effect
        const parallaxAmount = 0.5 + (index % 3) * 0.2;

        gsap.to(contract, {
          x: mouseXPercent * 20 * parallaxAmount,
          y: mouseYPercent * 20 * parallaxAmount,
          duration: 1,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className || ""}`}
    >
      {/* Contract 1 */}
      <div className="floating-contract absolute w-56 h-72 bg-white/70 backdrop-blur-md rounded-lg shadow-lg p-4 border border-white/30">
        <div className="h-3 w-20 bg-blue-400/50 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-4/5 bg-gray-200/70 rounded"></div>
          <div className="h-2 w-3/5 bg-gray-200/70 rounded"></div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-3/4 bg-gray-200/70 rounded"></div>
        </div>
        <div className="absolute bottom-4 right-4 h-12 w-20 bg-blue-400/30 rounded flex items-center justify-center">
          <div className="h-6 w-10 bg-blue-500/40 rounded"></div>
        </div>
      </div>

      {/* Contract 2 */}
      <div className="floating-contract absolute w-48 h-64 bg-white/70 backdrop-blur-md rounded-lg shadow-lg p-4 border border-white/30">
        <div className="h-3 w-16 bg-purple-400/50 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-2/3 bg-gray-200/70 rounded"></div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-4/5 bg-gray-200/70 rounded"></div>
          <div className="h-2 w-3/5 bg-gray-200/70 rounded"></div>
        </div>
        <div className="absolute bottom-4 right-4 h-10 w-16 bg-purple-400/30 rounded flex items-center justify-center">
          <div className="h-5 w-8 bg-purple-500/40 rounded"></div>
        </div>
      </div>

      {/* Contract 3 */}
      <div className="floating-contract absolute w-52 h-68 bg-white/70 backdrop-blur-md rounded-lg shadow-lg p-4 border border-white/30">
        <div className="h-3 w-24 bg-green-400/50 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-3/4 bg-gray-200/70 rounded"></div>
          <div className="h-2 w-1/2 bg-gray-200/70 rounded"></div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-full bg-gray-200/70 rounded"></div>
          <div className="h-2 w-2/3 bg-gray-200/70 rounded"></div>
        </div>
        <div className="absolute bottom-4 right-4 h-12 w-20 bg-green-400/30 rounded flex items-center justify-center">
          <div className="h-6 w-10 bg-green-500/40 rounded"></div>
        </div>
      </div>

      {/* Contract 4 - smaller */}
      <div className="floating-contract absolute w-40 h-56 bg-white/70 backdrop-blur-md rounded-lg shadow-lg p-3 border border-white/30">
        <div className="h-2 w-14 bg-amber-400/50 rounded mb-3"></div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-gray-200/70 rounded"></div>
          <div className="h-1.5 w-4/5 bg-gray-200/70 rounded"></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-full bg-gray-200/70 rounded"></div>
          <div className="h-1.5 w-full bg-gray-200/70 rounded"></div>
          <div className="h-1.5 w-3/4 bg-gray-200/70 rounded"></div>
        </div>
        <div className="absolute bottom-3 right-3 h-8 w-14 bg-amber-400/30 rounded flex items-center justify-center">
          <div className="h-4 w-8 bg-amber-500/40 rounded"></div>
        </div>
      </div>

      {/* Contract 5 - smallest */}
      <div className="floating-contract absolute w-36 h-48 bg-white/70 backdrop-blur-md rounded-lg shadow-lg p-3 border border-white/30">
        <div className="h-2 w-12 bg-pink-400/50 rounded mb-3"></div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-gray-200/70 rounded"></div>
          <div className="h-1.5 w-2/3 bg-gray-200/70 rounded"></div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-full bg-gray-200/70 rounded"></div>
          <div className="h-1.5 w-4/5 bg-gray-200/70 rounded"></div>
        </div>
        <div className="absolute bottom-3 right-3 h-7 w-12 bg-pink-400/30 rounded flex items-center justify-center">
          <div className="h-3.5 w-7 bg-pink-500/40 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default FloatingContracts;

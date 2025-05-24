"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FloatingContracts from "./FloatingContracts";
import TypeWriter from "./TypeWriter";
import FeaturesSection from "./FeaturesSection";
import TestimonialsSection from "./TestimonialsSection";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const HeroTest = () => {
  const router = useRouter();
  const [contractWish, setContractWish] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  // Sample contract data
  const sampleContracts = [
    {
      title: "Freelance Design Agreement",
      content:
        "Professional agreement for design services including deliverables and payment terms.",
      color: "#E9D8FD", // Light purple
    },
    {
      title: "Web Development Contract",
      content:
        "Comprehensive contract for full-stack web development services with milestone payments.",
      color: "#FEEBC8", // Light orange
    },
    {
      title: "Content Creation Agreement",
      content:
        "Terms for content creation including copyright transfer and revision process.",
      color: "#D1FAE5", // Light green
    },
  ];

  // TypeWriter texts
  const typewriterTexts = [
    "freelance contracts",
    "consulting agreements",
    "service agreements",
    "design contracts",
    "development agreements",
  ];

  useEffect(() => {
    // Initialize animations when component mounts
    const ctx = gsap.context(() => {
      // Animate hero section
      gsap.from(heroRef.current, {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: "power3.out",
      });

      // Animate contract cards
      gsap.from(".contract-card", {
        opacity: 0,
        y: 50,
        stagger: 0.2,
        duration: 0.8,
        ease: "back.out(1.7)",
        delay: 0.5,
      });

      // Add hover effect for cards
      document.querySelectorAll(".contract-card").forEach((card) => {
        card.addEventListener("mouseenter", () => {
          gsap.to(card, {
            y: -10,
            scale: 1.03,
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            duration: 0.3,
          });
        });

        card.addEventListener("mouseleave", () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            duration: 0.3,
          });
        });
      });

      // Input focus animation
      if (inputRef.current) {
        inputRef.current.addEventListener("focus", () => {
          gsap.to(".input-container", {
            boxShadow: "0 0 0 3px rgba(66, 153, 225, 0.5)",
            borderColor: "#4299E1",
            duration: 0.3,
          });
        });

        inputRef.current.addEventListener("blur", () => {
          gsap.to(".input-container", {
            boxShadow: "0 0 0 0 rgba(66, 153, 225, 0)",
            borderColor: "#E2E8F0",
            duration: 0.3,
          });
        });
      }

      // Animate floating contracts background
      if (floatingRef.current) {
        gsap.from(floatingRef.current, {
          opacity: 0,
          duration: 2,
          ease: "power2.out",
          delay: 0.8,
        });
      }
    });

    // Cleanup function
    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractWish.trim()) {
      // Store the contract wish in localStorage to potentially use it later
      localStorage.setItem("contractWish", contractWish);

      // Animate the form submission
      gsap.to(".input-container", {
        y: -20,
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          // Navigate to signup page
          router.push("/signup");
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
      {/* Background floating contracts */}
      <div
        ref={floatingRef}
        className="absolute inset-0 opacity-20 pointer-events-none"
      >
        <FloatingContracts />
      </div>

      {/* Hero Section */}
      <div
        ref={heroRef}
        className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10"
      >
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Create Professional <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              <TypeWriter
                texts={typewriterTexts}
                typingSpeed={70}
                className="inline-block min-w-[300px] text-left"
              />
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stop spending hours drafting contracts. Tell us what you need, and
            we'll generate a professional contract tailored to your business.
          </p>
        </div>

        {/* Interactive Input */}
        <div className="max-w-2xl mx-auto mb-20">
          <form onSubmit={handleSubmit} className="relative">
            <div className="input-container flex items-center overflow-hidden bg-white rounded-full border border-gray-200 shadow-sm transition-all duration-300">
              <input
                ref={inputRef}
                type="text"
                value={contractWish}
                onChange={(e) => setContractWish(e.target.value)}
                placeholder="Describe the contract you need..."
                className="flex-grow px-6 py-4 text-lg focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full font-medium hover:opacity-90 transition-opacity m-1 flex items-center"
              >
                <span>Get Started</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Sample Contracts with Glass Effect */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {sampleContracts.map((contract, index) => (
            <div
              key={index}
              className="contract-card relative overflow-hidden rounded-2xl backdrop-blur-md border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${contract.color}80, ${contract.color}40)`,
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* Glass effect elements */}
              <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm z-0"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/30 blur-2xl"></div>

              {/* Content */}
              <div className="relative z-10 p-8">
                <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md mb-6 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {contract.title}
                </h3>
                <p className="text-gray-700 mb-6">{contract.content}</p>
                <button
                  className="text-gray-900 font-medium flex items-center hover:text-blue-700 transition-colors"
                  onClick={() => {
                    localStorage.setItem("contractWish", contract.title);

                    // Animate the card before navigation
                    gsap.to(`.contract-card:nth-child(${index + 1})`, {
                      scale: 1.05,
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      duration: 0.3,
                      onComplete: () => {
                        router.push("/signup");
                      },
                    });
                  }}
                >
                  Use this template
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <FeaturesSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Streamline Your Contract Process?
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-10">
            Join thousands of professionals who have simplified their contract
            workflow.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-700 rounded-full text-lg font-medium shadow-lg hover:bg-blue-50 transition-colors"
          >
            Get Started For Free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Floating Action Button */}
      <Link
        href="/signup"
        className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 z-20"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </Link>
    </div>
  );
};

export default HeroTest;

"use client";

import React from "react";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    title: "AI-Powered Contract Generation",
    description:
      "Our advanced AI analyzes your requirements and generates professional contracts tailored to your specific needs.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
        <path d="M12 2a10 10 0 0 1 10 10h-10V2Z" />
        <path d="M12 12 2.1 2.1" />
      </svg>
    ),
  },
  {
    title: "Legally Compliant Templates",
    description:
      "All contracts are based on legally sound templates reviewed by professional attorneys to ensure compliance.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 14 4-4" />
        <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        <path d="M18 22H6a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2Z" />
      </svg>
    ),
  },
  {
    title: "Digital Signatures",
    description:
      "Securely sign contracts online with legally binding digital signatures that comply with e-signature laws.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
        <path d="m8 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Custom Branding",
    description:
      "Add your logo, colors, and brand elements to create professional-looking contracts that represent your business.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        <path d="M19 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        <path d="M5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        <path d="M12 12h7" />
        <path d="M5 12h7" />
      </svg>
    ),
  },
  {
    title: "Secure Document Storage",
    description:
      "All your contracts are securely stored in the cloud, accessible anytime from anywhere with proper authentication.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 10V3" />
        <path d="M4 10h16" />
        <path d="M4 10a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2" />
        <path d="M12 14v4" />
        <path d="M12 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
      </svg>
    ),
  },
  {
    title: "Revision History",
    description:
      "Track changes with complete revision history, ensuring you can review and revert to previous versions if needed.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Professional Contracts
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform provides all the tools you need to create, manage,
              and sign contracts with ease.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {features.map((feature, index) => (
            <ScrollReveal
              key={index}
              animation="fade-up"
              delay={index * 0.1}
              className="bg-gray-50 rounded-xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col h-full">
                <div className="h-12 w-12 bg-blue-100 rounded-lg text-blue-600 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 flex-grow">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

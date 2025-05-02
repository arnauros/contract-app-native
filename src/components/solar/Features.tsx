"use client";

import Image from "next/image";
import { FadeDiv } from "./Fade";

export default function Features() {
  return (
    <section aria-label="features" className="mx-auto max-w-6xl">
      <div className="text-center">
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          Features
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Complete Solar Automation
        </h2>
        <p className="mt-3 text-lg text-gray-600 sm:mt-4">
          Intelligent systems optimizing energy production and usage
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FadeDiv key={feature.title}>
            <div className="h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50">
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          </FadeDiv>
        ))}
      </div>

      <div className="mt-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-orange-50 to-white p-8 shadow-sm sm:p-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Smart Solar Tracking
              </h3>
              <p className="mt-4 text-lg text-gray-600">
                Our advanced solar tracking system maximizes energy production
                by following the sun's position throughout the day. Integrated
                sensors and machine learning algorithms optimize panel angles in
                real-time for up to 25% more energy generation.
              </p>
              <ul className="mt-8 space-y-4">
                {trackingFeatures.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <div className="mr-3 rounded-full bg-orange-100 p-1">
                      <svg
                        className="h-4 w-4 text-orange-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="h-[300px] w-[300px] overflow-hidden rounded-full bg-orange-100 sm:h-[400px] sm:w-[400px]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[280px] w-[280px] rounded-full bg-white sm:h-[380px] sm:w-[380px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-[250px] w-[250px] sm:h-[350px] sm:w-[350px]">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-64 w-64 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 sm:h-80 sm:w-80"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: "🔆",
    title: "Solar Tracking",
    description:
      "Intelligent panels that follow the sun for optimal energy production throughout the day.",
  },
  {
    icon: "⚡",
    title: "Energy Storage",
    description:
      "Advanced battery systems that store excess energy for use during night or cloudy days.",
  },
  {
    icon: "📊",
    title: "Real-time Analytics",
    description:
      "Comprehensive dashboards showing energy production, consumption, and savings.",
  },
  {
    icon: "📱",
    title: "Mobile Control",
    description:
      "Control and monitor your solar system from anywhere using our mobile app.",
  },
  {
    icon: "🔧",
    title: "Auto-Maintenance",
    description:
      "Self-diagnosing systems that detect and report issues before they become problems.",
  },
  {
    icon: "🌱",
    title: "Eco Impact Tracking",
    description:
      "Visualize your contribution to reducing carbon footprint and environmental impact.",
  },
];

const trackingFeatures = [
  "25% more energy production compared to fixed panels",
  "Weather-adaptive positioning for storm protection",
  "Self-cleaning mode reduces maintenance needs",
  "Integration with home automation systems",
];

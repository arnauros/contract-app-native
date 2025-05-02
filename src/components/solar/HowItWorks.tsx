"use client";

import { FadeDiv } from "./Fade";

export default function HowItWorks() {
  return (
    <section aria-label="how-it-works" className="mx-auto max-w-6xl">
      <div className="text-center">
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          How It Works
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Three Simple Steps to Get Paid
        </h2>
        <p className="mt-3 text-lg text-gray-600 sm:mt-4 max-w-2xl mx-auto">
          From project details to payment in under 5 minutes
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {steps.map((step) => (
          <FadeDiv key={step.title}>
            <div className="relative h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -top-4 -left-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-lg border border-orange-200">
                {step.number}
              </div>
              <div className="mt-4 mb-6 h-32 flex items-center justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                  <span className="text-4xl">{step.icon}</span>
                </div>
              </div>
              <h3 className="mb-2 text-xl font-medium text-center text-gray-900">
                {step.title}
              </h3>
              <p className="text-center text-gray-600">{step.description}</p>
            </div>
          </FadeDiv>
        ))}
      </div>

      <div className="mt-16 flex justify-center">
        <FadeDiv>
          <div className="flex items-center justify-center gap-3 rounded-full bg-orange-50 pl-1 pr-4 py-1 text-sm text-orange-700">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium">
              Tip
            </span>
            <span>Most contracts get signed within 24 hours</span>
          </div>
        </FadeDiv>
      </div>
    </section>
  );
}

const steps = [
  {
    number: "1",
    icon: "📋",
    title: "Input project details",
    description:
      "Answer a few simple questions about your project, timeline, and payment needs.",
  },
  {
    number: "2",
    icon: "📤",
    title: "Generate & send contract",
    description:
      "We create a professional contract that you can review, customize, and send with one click.",
  },
  {
    number: "3",
    icon: "💵",
    title: "Get signed & paid",
    description:
      "Clients sign digitally and can pay directly through the same secure platform.",
  },
];

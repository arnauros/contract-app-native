"use client";

import { FadeDiv } from "./Fade";

export default function ProblemSolution() {
  return (
    <section aria-label="problem-solution" className="mx-auto max-w-6xl">
      <div className="text-center">
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          Why This Matters
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          From Contract Chaos to Cash Flow Control
        </h2>
        <p className="mt-3 text-lg text-gray-600 sm:mt-4 max-w-2xl mx-auto">
          Contracts shouldn't be the bottleneck in your freelance business
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
        <FadeDiv>
          <div className="h-full rounded-lg border border-gray-200 bg-gradient-to-b from-red-50 to-white p-6 shadow-sm">
            <h3 className="mb-6 text-xl font-medium text-gray-900 flex items-center">
              <span className="mr-3 text-2xl">😬</span>
              The Problems
            </h3>
            <ul className="space-y-6">
              {problems.map((problem) => (
                <li key={problem.title} className="flex">
                  <div className="mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
                    <span className="text-lg">{problem.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {problem.title}
                    </h4>
                    <p className="mt-1 text-gray-600">{problem.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </FadeDiv>

        <FadeDiv>
          <div className="h-full rounded-lg border border-gray-200 bg-gradient-to-b from-green-50 to-white p-6 shadow-sm">
            <h3 className="mb-6 text-xl font-medium text-gray-900 flex items-center">
              <span className="mr-3 text-2xl">✅</span>
              The Solutions
            </h3>
            <ul className="space-y-6">
              {solutions.map((solution) => (
                <li key={solution.title} className="flex">
                  <div className="mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-500">
                    <span className="text-lg">{solution.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {solution.title}
                    </h4>
                    <p className="mt-1 text-gray-600">{solution.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </FadeDiv>
      </div>
    </section>
  );
}

const problems = [
  {
    icon: "📝",
    title: "Writing contracts is confusing",
    description:
      "Finding the right template, customizing it, and ensuring it's legally sound takes hours you don't have.",
  },
  {
    icon: "👻",
    title: "Clients ghost after you send contracts",
    description:
      "Long, complicated contracts scare clients away or sit unopened in their inbox for weeks.",
  },
  {
    icon: "💸",
    title: "Payment terms get ignored",
    description:
      "Clients conveniently forget your payment terms when they're buried in pages of legalese.",
  },
];

const solutions = [
  {
    icon: "⚡",
    title: "Contracts in minutes, not hours",
    description:
      "Our guided process creates professional, customized contracts tailored to your specific project.",
  },
  {
    icon: "✍️",
    title: "E-signatures made ridiculously simple",
    description:
      "One-click signing process with automatic reminders means contracts get signed faster.",
  },
  {
    icon: "💰",
    title: "Get paid on time, every time",
    description:
      "Integrated payment reminders and options mean clients can pay directly from the signed contract.",
  },
];

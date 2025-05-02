"use client";

import { FadeDiv } from "./Fade";

export default function WhoItsFor() {
  return (
    <section aria-label="who-its-for" className="mx-auto max-w-6xl">
      <div className="rounded-2xl bg-gradient-to-b from-blue-50 to-white p-8 shadow-sm sm:p-12">
        <div className="text-center mb-12">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            Who It's For
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Built for Creative Freelancers
          </h2>
          <p className="mt-3 text-lg text-gray-600 sm:mt-4 max-w-2xl mx-auto">
            Specifically designed for the needs of digital professionals
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {freelancerTypes.map((type) => (
            <FadeDiv key={type.title}>
              <div className="h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 text-center">
                  <span className="text-4xl">{type.icon}</span>
                </div>
                <h3 className="mb-2 text-lg font-medium text-center text-gray-900">
                  {type.title}
                </h3>
                <p className="text-center text-gray-600">{type.description}</p>
              </div>
            </FadeDiv>
          ))}
        </div>

        <div className="mt-16">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              Compatible with your favorite tools
            </h3>
            <div className="flex flex-wrap justify-center gap-8 mt-6">
              {tools.map((tool) => (
                <div key={tool.name} className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">{tool.icon}</span>
                  </div>
                  <span className="mt-2 text-sm text-gray-600">
                    {tool.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const freelancerTypes = [
  {
    icon: "🎨",
    title: "Designers",
    description:
      "UI/UX, graphic design, and branding projects with clear deliverables and revisions.",
  },
  {
    icon: "💻",
    title: "Developers",
    description:
      "Custom coding, website development, and app projects with milestone payments.",
  },
  {
    icon: "📷",
    title: "Content Creators",
    description:
      "Photographers, videographers, and writers with usage rights and licensing terms.",
  },
  {
    icon: "🚀",
    title: "Consultants",
    description:
      "Marketing, SEO, and business consultants with retainer or project-based work.",
  },
];

const tools = [
  { icon: "🔄", name: "Stripe" },
  { icon: "📝", name: "Notion" },
  { icon: "💬", name: "Slack" },
  { icon: "⚙️", name: "Zapier" },
  { icon: "📊", name: "Trello" },
];

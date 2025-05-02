"use client";

import { FadeDiv } from "./Fade";

export function SocialProof() {
  return (
    <section aria-label="social-proof" className="mx-auto max-w-6xl">
      <div className="text-center mb-12">
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          Social Proof
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Trusted by Freelancers
        </h2>
        <p className="mt-3 text-lg text-gray-600 sm:mt-4 max-w-2xl mx-auto">
          Join hundreds of creative professionals sending better contracts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <FadeDiv key={testimonial.name}>
            <div className="h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-600">
                  <div className="flex h-full w-full items-center justify-center text-white font-medium">
                    {testimonial.name.charAt(0)}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.title}
                  </div>
                </div>
              </div>
              <div className="mb-3 flex text-orange-400">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-gray-700">"{testimonial.quote}"</p>
            </div>
          </FadeDiv>
        ))}
      </div>

      <div className="mt-16">
        <FadeDiv>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-xl font-medium text-center text-gray-900">
              Used by freelancers from companies like
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {companies.map((company) => (
                <div key={company} className="flex items-center justify-center">
                  <div className="px-4 py-2 text-gray-500 font-medium text-lg">
                    {company}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeDiv>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-4">
        {badges.map((badge) => (
          <FadeDiv key={badge.text}>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-green-500">{badge.icon}</span>
              <span className="text-sm font-medium text-gray-700">
                {badge.text}
              </span>
            </div>
          </FadeDiv>
        ))}
      </div>
    </section>
  );
}

const testimonials = [
  {
    name: "Alex Morgan",
    title: "UX Designer",
    quote:
      "I used to spend hours on contracts. Now I create and send them in minutes, and clients sign them same-day. Game changer!",
  },
  {
    name: "Chris Johnson",
    title: "Web Developer",
    quote:
      "The integrated payment system means I don't have to chase clients anymore. They can pay directly from the contract.",
  },
  {
    name: "Sarah Williams",
    title: "Content Creator",
    quote:
      "My contract signing rate went from 60% to 95% after switching. The simple interface makes clients feel comfortable.",
  },
];

const companies = ["Google", "Apple", "Microsoft", "Shopify", "Airbnb"];

const badges = [
  { icon: "✓", text: "256-bit encryption" },
  { icon: "✓", text: "GDPR compliant" },
  { icon: "✓", text: "Cancel anytime" },
  { icon: "✓", text: "Free updates" },
];

"use client";

import { FadeDiv } from "./Fade";

export default function BentoFeatures() {
  return (
    <div className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
        <h2 className="text-base/7 font-semibold text-orange-600">
          Get paid faster
        </h2>
        <p className="mt-2 max-w-lg text-pretty text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
          Everything you need to manage your freelance business
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          <div className="relative lg:col-span-3">
            <div className="absolute inset-px rounded-lg bg-white max-lg:rounded-t-[2rem] lg:rounded-tl-[2rem]" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] max-lg:rounded-t-[calc(2rem+1px)] lg:rounded-tl-[calc(2rem+1px)]">
              <img
                alt="Professional contract templates that clients love to sign"
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                className="h-80 object-cover object-left"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-orange-600">
                  Professional Templates
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Contracts that get signed
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Use our professionally designed contract templates that are
                  easy to understand and clients love to sign. No more
                  intimidating legal jargon.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow ring-1 ring-black/5 max-lg:rounded-t-[2rem] lg:rounded-tl-[2rem]" />
          </div>
          <div className="relative lg:col-span-3">
            <div className="absolute inset-px rounded-lg bg-white lg:rounded-tr-[2rem]" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] lg:rounded-tr-[calc(2rem+1px)]">
              <img
                alt="Digital signatures for quick approvals"
                src="https://images.unsplash.com/photo-1560472355-536de3962603?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                className="h-80 object-cover object-left lg:object-right"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-orange-600">
                  Digital Signatures
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Legally binding e-signatures
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Get contracts signed quickly with our secure digital signature
                  system that's legally binding in most jurisdictions worldwide.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow ring-1 ring-black/5 lg:rounded-tr-[2rem]" />
          </div>
          <div className="relative lg:col-span-2">
            <div className="absolute inset-px rounded-lg bg-white lg:rounded-bl-[2rem]" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] lg:rounded-bl-[calc(2rem+1px)]">
              <img
                alt="Automated payment reminders"
                src="https://images.unsplash.com/photo-1616514197671-15d99ce7a6f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                className="h-80 object-cover object-left"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-orange-600">
                  Payments
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Automatic reminders
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Set automatic payment reminders to ensure clients never miss a
                  payment deadline.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow ring-1 ring-black/5 lg:rounded-bl-[2rem]" />
          </div>
          <div className="relative lg:col-span-2">
            <div className="absolute inset-px rounded-lg bg-white" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
              <img
                alt="Client portal for easy collaboration"
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                className="h-80 object-cover"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-orange-600">
                  Client Portal
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Easy client access
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Provide clients with their own portal to view contracts, make
                  payments, and communicate directly.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow ring-1 ring-black/5" />
          </div>
          <div className="relative lg:col-span-2">
            <div className="absolute inset-px rounded-lg bg-white max-lg:rounded-b-[2rem] lg:rounded-br-[2rem]" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-br-[calc(2rem+1px)]">
              <img
                alt="Detailed analytics dashboard"
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80"
                className="h-80 object-cover"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-orange-600">
                  Analytics
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Track your business growth
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Visualize your business performance with detailed analytics on
                  contracts, payments, and client activity.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow ring-1 ring-black/5 max-lg:rounded-b-[2rem] lg:rounded-br-[2rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}

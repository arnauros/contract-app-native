"use client";

import Link from "next/link";
import { FadeDiv } from "./Fade";

export function CallToAction() {
  return (
    <FadeDiv className="mx-auto max-w-5xl">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-8 shadow-lg sm:p-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stop sending contracts that don't get signed
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-orange-100">
            Join freelancers who are getting paid faster with contracts clients
            actually sign
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-white px-6 text-base font-medium text-orange-600 shadow-sm hover:bg-orange-50"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-md border border-orange-200 bg-transparent px-6 text-base font-medium text-white shadow-sm hover:bg-orange-600"
            >
              View Pricing
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-orange-100">
            <div className="flex items-center">
              <svg
                className="mr-2 h-5 w-5 text-orange-200"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center">
              <svg
                className="mr-2 h-5 w-5 text-orange-200"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Free contract templates
            </div>
            <div className="flex items-center">
              <svg
                className="mr-2 h-5 w-5 text-orange-200"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </FadeDiv>
  );
}

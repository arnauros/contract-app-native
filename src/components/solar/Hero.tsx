"use client";

import Link from "next/link";
import { FadeContainer, FadeDiv, FadeSpan } from "./Fade";
import { HeroChat } from "./HeroChat";

export function Hero() {
  return (
    <section aria-label="hero" className="pb-24">
      <FadeContainer className="relative flex flex-col items-center justify-center">
        <FadeDiv className="mx-auto">
          <Link
            href="#"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-gray-100"
          >
            <span className="px-1.5 py-0.5 text-xs font-medium text-gray-600 rounded-full border border-gray-200 bg-gray-50">
              New
            </span>
            <span className="text-gray-800 text-sm font-medium">
              E-signature + Payments in one platform
            </span>
            <svg
              className="w-3.5 h-3.5 text-gray-700"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z" />
            </svg>
          </Link>
        </FadeDiv>
        <h1 className="mt-10 text-center text-5xl font-semibold tracking-tighter text-gray-900 sm:text-7xl sm:leading-[5rem]">
          <FadeSpan>Send contracts.</FadeSpan>{" "}
          <FadeSpan>Send Invoices.</FadeSpan>
          <br />
          <FadeSpan>Get paid.</FadeSpan> <FadeSpan>No stress.</FadeSpan>
        </h1>
        <p className="mt-8 max-w-xl text-center text-base text-balance text-gray-700 sm:mt-10 sm:text-xl">
          <FadeSpan>
            Talon helps freelancers create contracts and invoices that get
            signatures faster
          </FadeSpan>{" "}
          <FadeSpan>and make more money</FadeSpan>
        </p>

        {/* Chat Interface */}
        <FadeDiv className="mt-16 w-full px-6">
          <HeroChat />
        </FadeDiv>
      </FadeContainer>
    </section>
  );
}

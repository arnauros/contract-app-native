"use client";

import Link from "next/link";
import { FadeContainer, FadeDiv, FadeSpan } from "./Fade";

export function Hero() {
  return (
    <section aria-label="hero">
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
        <h1 className="mt-8 text-center text-5xl font-semibold tracking-tighter text-gray-900 sm:text-7xl sm:leading-[5rem]">
          <FadeSpan>Send contracts.</FadeSpan> <FadeSpan>Get paid.</FadeSpan>
          <br />
          <FadeSpan>No</FadeSpan> <FadeSpan>stress.</FadeSpan>
        </h1>
        <p className="mt-5 max-w-xl text-center text-base text-balance text-gray-700 sm:mt-8 sm:text-xl">
          <FadeSpan>Freelancer contracts that clients actually sign</FadeSpan>{" "}
          <FadeSpan>— fast, professional, and hassle-free.</FadeSpan>
        </p>
        <FadeDiv className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            className="inline-flex cursor-pointer flex-row items-center justify-center gap-1 rounded-md border-b-[1.5px] border-orange-700 bg-gradient-to-b from-orange-400 to-orange-500 px-6 py-3 text-base font-medium tracking-wide whitespace-nowrap text-white shadow-[0_0_0_2px_rgba(0,0,0,0.04),0_0_14px_0_rgba(255,255,255,0.19)] transition-all duration-200 ease-in-out hover:shadow-orange-300"
            href="#"
          >
            Start Free
          </Link>
          <Link
            className="inline-flex items-center justify-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
            href="#"
          >
            See how fast it works →
          </Link>
        </FadeDiv>
      </FadeContainer>
    </section>
  );
}

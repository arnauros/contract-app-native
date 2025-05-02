"use client";

import Link from "next/link";
import { FadeContainer, FadeDiv, FadeSpan } from "./Fade";
import GameOfLife from "./HeroBackground";

export function Hero() {
  return (
    <section aria-label="hero">
      <FadeContainer className="relative flex flex-col items-center justify-center">
        <FadeDiv className="mx-auto">
          <Link
            aria-label="View latest update"
            href="#"
            className="mx-auto w-full"
          >
            <div className="inline-flex max-w-full items-center gap-3 rounded-full bg-white/5 px-2.5 py-0.5 pr-3 pl-0.5 font-medium text-gray-900 ring-1 shadow-lg shadow-orange-400/20 ring-black/10 filter backdrop-blur-[1px] transition-colors hover:bg-orange-500/[2.5%] focus:outline-hidden sm:text-sm">
              <span className="shrink-0 truncate rounded-full border bg-gray-50 px-2.5 py-1 text-sm text-gray-600 sm:text-xs">
                New
              </span>
              <span className="flex items-center gap-1 truncate">
                <span className="w-full truncate">
                  E-signature + Payments in one place
                </span>
                <svg
                  className="size-4 shrink-0 text-gray-700"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z" />
                </svg>
              </span>
            </div>
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
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <GameOfLife />
        </div>
      </FadeContainer>
    </section>
  );
}

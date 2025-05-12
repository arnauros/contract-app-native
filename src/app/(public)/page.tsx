"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hero } from "@/components/solar/Hero";
import ProblemSolution from "@/components/solar/ProblemSolution";
import HowItWorks from "@/components/solar/HowItWorks";
import WhoItsFor from "@/components/solar/WhoItsFor";
import FeatureDivider from "@/components/solar/FeatureDivider";
import { SocialProof } from "@/components/solar/SocialProof";
import { CallToAction } from "@/components/solar/CallToAction";
import VerticalLines from "@/components/solar/VerticalLines";
import GameOfLife from "@/components/solar/HeroBackground";
import BentoFeatures from "@/components/solar/BentoFeatures";

export default function LandingPage() {
  const [debugInfo, setDebugInfo] = useState({
    hostname: "",
    pathname: "",
    fullUrl: "",
  });

  useEffect(() => {
    // Enhanced logging for debugging
    console.log("🚀 LANDING PAGE DEBUG INFO 🚀");
    console.log("Landing page mounted at time:", new Date().toISOString());
    console.log("Current URL:", window.location.href);
    console.log("Current hostname:", window.location.hostname);

    // Set debug info for display
    setDebugInfo({
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      fullUrl: window.location.href,
    });
  }, []);

  return (
    <main className="relative mx-auto flex flex-col overflow-x-hidden">
      <div className="pt-32 relative">
        <div className="absolute inset-0 -z-10">
          <GameOfLife />
        </div>
        <VerticalLines />
        <Hero />
      </div>
      <div className="mt-24 px-6 xl:px-0">
        <ProblemSolution />
      </div>
      <FeatureDivider className="my-16 max-w-6xl" />
      <div className="mt-16 px-6 xl:px-0">
        <BentoFeatures />
      </div>
      <FeatureDivider className="my-16 max-w-6xl" />
      <div className="mt-16 px-6 xl:px-0">
        <HowItWorks />
      </div>
      <FeatureDivider className="my-16 max-w-6xl" />
      <div className="mt-16 px-6 xl:px-0">
        <WhoItsFor />
      </div>
      <FeatureDivider className="my-16 max-w-6xl" />
      <div className="mt-16 mb-24 px-6 xl:px-0">
        <SocialProof />
      </div>
      <div className="mt-16 mb-32 px-6 xl:px-0">
        <CallToAction />
      </div>

      <div className="flex justify-center mb-16 gap-4 flex-wrap">
        <a
          href="/login"
          className="px-6 py-3 text-base font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Sign in
        </a>
        <Link
          href="/pricing"
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          View Pricing
        </Link>
        <Link
          href="/test-flow"
          className="px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-600 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Test Subscription Flow
        </Link>
      </div>

      {/* Debug info (only shown in development) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 p-4 bg-gray-100 rounded text-xs max-w-lg opacity-70 hover:opacity-100 transition-opacity">
          <h3 className="font-bold">Debug Information:</h3>
          <pre className="overflow-auto max-h-32">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}

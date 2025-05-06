"use client";

import { useState, useEffect } from "react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import { useDomain } from "@/lib/hooks/useDomain";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

export default function PricingPage() {
  const { loading, error } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const { isAppLocal } = useDomain();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const handleSubscribe = () => {
    // Set redirecting state to true to show loading UI
    setRedirecting(true);
    // Redirect to the multi-step subscribe page with the selected billing interval
    router.push(`/subscribe?interval=${billingInterval}`);
  };

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">
            Pricing
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose the right plan for&nbsp;you
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Get access to all premium features with our subscription plan.
        </p>
        <div className="mt-16 flex justify-center">
          <div className="relative rounded-full bg-gray-100 p-1">
            <button
              type="button"
              className={`${
                billingInterval === "monthly"
                  ? "bg-white shadow-sm"
                  : "text-gray-500"
              } relative rounded-full px-4 py-2 text-sm font-semibold transition-all`}
              onClick={() => setBillingInterval("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`${
                billingInterval === "yearly"
                  ? "bg-white shadow-sm"
                  : "text-gray-500"
              } relative rounded-full px-4 py-2 text-sm font-semibold transition-all`}
              onClick={() => setBillingInterval("yearly")}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-1">
          <div className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10">
            <div className="flex items-center justify-between gap-x-4">
              <h3
                id="tier-pro"
                className="text-lg font-semibold leading-8 text-gray-900"
              >
                Pro
              </h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Get access to all premium features and priority support.
            </p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                ${billingInterval === "monthly" ? "29" : "290"}
              </span>
              <span className="text-sm font-semibold leading-6 text-gray-600">
                /{billingInterval === "monthly" ? "month" : "year"}
              </span>
            </p>
            <button
              onClick={handleSubscribe}
              disabled={redirecting}
              className="mt-6 block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
            >
              {redirecting ? "Redirecting..." : "Subscribe now"}
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <ul
              role="list"
              className="mt-8 space-y-3 text-sm leading-6 text-gray-600"
            >
              <li className="flex gap-x-3">
                <svg
                  className="h-6 w-5 flex-none text-indigo-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                All premium features
              </li>
              <li className="flex gap-x-3">
                <svg
                  className="h-6 w-5 flex-none text-indigo-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Priority support
              </li>
              <li className="flex gap-x-3">
                <svg
                  className="h-6 w-5 flex-none text-indigo-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Cancel anytime
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

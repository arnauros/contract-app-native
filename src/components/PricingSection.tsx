"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";

// Features included in each plan
const includedFeatures = [
  "Private forum access",
  "Member resources",
  "Entry to annual conference",
  "Official member t-shirt",
];

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const { createCheckoutSession } = useSubscription();
  const { user, loggedIn } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const pricingDetails = {
    monthly: {
      price: "19",
      period: "month",
    },
    yearly: {
      price: "199",
      period: "year",
      discount: "Save $29",
    },
  };

  const handleSubscribe = async (interval: "monthly" | "yearly") => {
    if (!user) {
      // Redirect to login if not logged in
      window.location.href = "/login?redirect=pricing";
      return;
    }

    try {
      setRedirecting(true);

      // Get promo code from localStorage if exists
      const promoCode = localStorage.getItem("promo_code") || undefined;

      // Determine price ID based on interval
      const priceId =
        interval === "monthly"
          ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;

      if (!priceId) {
        throw new Error("Price ID not found");
      }

      // Show processing feedback
      const loadingToast = toast.loading("Preparing your checkout...");

      // Call the subscription service to create checkout
      const success = await createCheckoutSession(priceId, promoCode);

      // Dismiss the loading toast
      toast.dismiss(loadingToast);

      if (success === false) {
        setRedirecting(false);
        toast.error("Checkout creation failed. Please try again.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to start checkout process");
      setRedirecting(false);
    }
  };

  return (
    <div className="bg-white py-24 sm:py-32" id="pricing">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl sm:text-center">
          <h2 className="text-pretty text-5xl font-semibold tracking-tight text-gray-900 sm:text-balance sm:text-6xl">
            Simple no-tricks pricing
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
            Distinctio et nulla eum soluta et neque labore quibusdam. Saepe et
            quasi iusto modi velit ut non voluptas in. Explicabo id ut laborum.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mx-auto mt-12 flex max-w-xs justify-center">
          <div className="relative flex w-full rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              className={cn(
                "w-1/2 rounded-md py-2 text-sm font-medium transition-all",
                billingPeriod === "monthly"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                "w-1/2 rounded-md py-2 text-sm font-medium transition-all",
                billingPeriod === "yearly"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              onClick={() => setBillingPeriod("yearly")}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
          <div className="p-8 sm:p-10 lg:flex-auto">
            <h3 className="text-3xl font-semibold tracking-tight text-gray-900">
              Premium Plan
            </h3>
            <p className="mt-6 text-base/7 text-gray-600">
              Lorem ipsum dolor sit amet consect etur adipisicing elit. Itaque
              amet indis perferendis blanditiis repellendus etur quidem
              assumenda.
            </p>
            <div className="mt-10 flex items-center gap-x-4">
              <h4 className="flex-none text-sm/6 font-semibold text-orange-600">
                What's included
              </h4>
              <div className="h-px flex-auto bg-gray-100" />
            </div>
            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 text-sm/6 text-gray-600 sm:grid-cols-2 sm:gap-6"
            >
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon
                    aria-hidden="true"
                    className="h-6 w-5 flex-none text-orange-600"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:shrink-0">
            <div className="rounded-2xl bg-gray-50 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
              <div className="mx-auto max-w-xs px-8">
                <p className="text-base font-semibold text-gray-600">
                  {billingPeriod === "yearly"
                    ? "Pay yearly, save more"
                    : "Pay monthly, cancel anytime"}
                </p>
                <p className="mt-6 flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-semibold tracking-tight text-gray-900">
                    ${pricingDetails[billingPeriod].price}
                  </span>
                  <span className="text-sm/6 font-semibold tracking-wide text-gray-600">
                    USD/{pricingDetails[billingPeriod].period}
                  </span>
                </p>
                {billingPeriod === "yearly" && (
                  <p className="mt-2 text-sm font-medium text-orange-600">
                    {pricingDetails.yearly.discount}
                  </p>
                )}
                <button
                  onClick={() => handleSubscribe(billingPeriod)}
                  disabled={redirecting}
                  className="mt-10 block w-full rounded-md bg-orange-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-70"
                >
                  {redirecting ? "Redirecting..." : "Get access"}
                </button>
                <p className="mt-6 text-xs/5 text-gray-600">
                  Invoices and receipts available for easy company reimbursement
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Free plan option */}
        <div className="mt-8 text-center">
          <a
            href="/signup"
            className="text-sm font-medium text-orange-600 hover:text-orange-500"
          >
            Or start with our free plan
          </a>
        </div>
      </div>
    </div>
  );
}

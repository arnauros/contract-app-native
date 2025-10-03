"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/lib/firebase/authUtils";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import Link from "next/link";
import toast from "react-hot-toast";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import SubscribeDebug from "./debug";

// Step indicators component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <div
            className={`w-12 h-1 ${
              currentStep >= 2 ? "bg-indigo-600" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <div className="text-xs text-center w-20">Account</div>
        <div className="text-xs text-center w-20">Payment</div>
      </div>
    </div>
  );
};

function SubscribeContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInterval =
    (searchParams?.get("interval") as "monthly" | "yearly") || "monthly";
  const { createCheckoutSession } = useSubscription();
  const { user, loading: authLoading } = useAuth();

  // Set initial billing interval from URL
  useEffect(() => {
    if (initialInterval) {
      setBillingInterval(initialInterval);
    }
  }, [initialInterval]);

  // If user is already logged in, go straight to the payment step
  useEffect(() => {
    if (!authLoading && user) {
      setCurrentStep(2);
    }
  }, [user, authLoading]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await signUp(email, password);

      if (result.error) {
        const errorMsg = result.error.message || "Failed to create account";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      if (result.user && app) {
        // Initialize Firestore
        const db = getFirestore(app);

        // Create a user document with default subscription data
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          displayName: name.trim(),
          createdAt: new Date(),
          subscription: {
            tier: "free",
            status: "inactive",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          },
          // Initialize contract and invoice settings with user info
          contractSettings: {
            companyName: company.trim() || name.trim(),
            companyAddress: "",
          },
          invoiceSettings: {
            name: name.trim(),
            email: result.user.email,
            company: company.trim() || name.trim(),
            address: "",
            iban: "",
            bankName: "",
            bicSwift: "",
            taxId: "",
            paymentTerms: "net30",
            currency: "USD",
          },
        });

        // Get the ID token
        const idToken = await result.user.getIdToken();

        // Create session
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: idToken }),
        });

        if (!response.ok) {
          throw new Error("Failed to create session");
        }

        toast.success("Account created successfully!");

        // Move to payment step
        setCurrentStep(2);
        setLoading(false);
      }
    } catch (error) {
      console.error("Signup error:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to create account. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("You need to create an account first");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    const priceId =
      billingInterval === "monthly"
        ? STRIPE_PRICE_IDS.MONTHLY
        : STRIPE_PRICE_IDS.YEARLY;

    try {
      // Show toast to indicate checkout is being prepared
      toast.loading("Preparing Stripe checkout...");
      await createCheckoutSession(priceId);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment process");
      setLoading(false);
    }
    // Note: We don't set loading to false in success path
    // as user will be redirected to Stripe
  };

  // Display a loading screen if auth is still being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading your account information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Subscribe Form */}
      <div className="flex-1 flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Basement</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {currentStep === 1
                ? "Create your account"
                : "Complete your subscription"}
            </h2>
            <p className="text-gray-600">
              {currentStep === 1
                ? "First, let's set up your account"
                : `Subscribe to Pro - $${
                    billingInterval === "monthly" ? "29/month" : "290/year"
                  }`}
            </p>

            <StepIndicator currentStep={currentStep} />
          </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && !user ? (
          // Step 1: Account Creation Form
          <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Company name (optional)"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? "Creating account..." : "Continue to payment"}
              </button>
            </div>

            <div className="text-center">
              <Link
                href={`/login?returnUrl=${encodeURIComponent(
                  `/subscribe?interval=${billingInterval}`
                )}`}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        ) : (
          // Step 2: Subscription Options
          <div className="mt-8 space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              {/* Billing interval selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing interval
                </label>
                <div className="relative rounded-full bg-gray-100 p-1 flex w-full">
                  <button
                    type="button"
                    className={`${
                      billingInterval === "monthly"
                        ? "bg-white shadow-sm"
                        : "text-gray-500"
                    } flex-1 relative rounded-full px-4 py-2 text-sm font-semibold transition-all`}
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
                    } flex-1 relative rounded-full px-4 py-2 text-sm font-semibold transition-all`}
                    onClick={() => setBillingInterval("yearly")}
                  >
                    Yearly
                  </button>
                </div>
                {billingInterval === "yearly" && (
                  <p className="mt-2 text-xs text-green-600">
                    Save 17% with annual billing
                  </p>
                )}
              </div>

              {/* Plan summary */}
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-900">Pro Plan</span>
                <span className="text-lg font-bold">
                  ${billingInterval === "monthly" ? "29" : "290"}
                </span>
              </div>

              <ul className="mb-6 space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-5 w-5 mr-2 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Unlimited contracts
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-5 w-5 mr-2 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Premium templates
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-5 w-5 mr-2 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Priority support
                </li>
              </ul>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
              >
                {loading ? "Redirecting to Stripe..." : "Subscribe now"}
              </button>

              <p className="mt-2 text-xs text-gray-500 text-center">
                You can cancel your subscription anytime
              </p>
            </div>

            {currentStep === 2 && (
              <div className="text-center">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Go back
                </button>
              </div>
            )}
          </div>
        )}

        <SubscribeDebug />
      </div>

      {/* Right Column - Visual Data Display */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500"></div>
        
        {/* Data Cards */}
        <div className="relative z-10 flex flex-col justify-center items-center space-y-8 p-12">
          {/* Top Card - Simple Graph */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-80">
            <div className="h-32 flex items-end space-x-2">
              <div className="bg-white/30 h-8 w-8 rounded"></div>
              <div className="bg-white/30 h-12 w-8 rounded"></div>
              <div className="bg-white/30 h-16 w-8 rounded"></div>
              <div className="bg-white/30 h-20 w-8 rounded"></div>
              <div className="bg-white/30 h-24 w-8 rounded"></div>
              <div className="bg-white/30 h-28 w-8 rounded"></div>
            </div>
          </div>

          {/* Middle Card - Engagement */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-80">
            <h3 className="text-white font-semibold text-lg mb-4">ENGAGEMENT</h3>
            <div className="text-white">
              <div className="text-3xl font-bold">+78,12%</div>
              <div className="text-sm opacity-80">last month</div>
            </div>
            <p className="text-white/80 text-sm mt-4 leading-relaxed">
              This significant increase in engagement rate highlights the effectiveness of our recent strategies and content approach.
            </p>
            <div className="mt-4 flex space-x-1">
              <div className="bg-white/30 h-4 w-8 rounded"></div>
              <div className="bg-white/30 h-6 w-8 rounded"></div>
              <div className="bg-white/30 h-8 w-8 rounded"></div>
              <div className="bg-white/30 h-10 w-8 rounded"></div>
              <div className="bg-white/30 h-12 w-8 rounded"></div>
            </div>
          </div>

          {/* Bottom Card - Total Sales */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-80">
            <h3 className="text-white font-semibold text-lg mb-4">TOTAL SALES</h3>
            <div className="text-white">
              <div className="text-3xl font-bold">$527.8K</div>
              <div className="text-sm opacity-80">+32% last month</div>
            </div>
            <p className="text-white/80 text-sm mt-4 leading-relaxed">
              This amount of total sales highlights the effectiveness of our recent strategies and content approach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}

import { loadStripe } from "@stripe/stripe-js";

// Define Stripe API version for consistency across the app
export const STRIPE_API_VERSION = "2025-08-27.basil";

// Initialize Stripe with your publishable key
export const getStripe = () => {
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  console.log("Stripe initialization:", {
    keyExists: !!stripeKey,
    keyLength: stripeKey?.length || 0,
    keyPrefix: stripeKey?.substring(0, 7) || "missing",
  });

  // Check if we have a valid key (not undefined or a placeholder)
  if (!stripeKey || stripeKey.includes("YourTest") || stripeKey.endsWith("%")) {
    console.warn(
      "Invalid or missing Stripe publishable key:",
      stripeKey ? "Key appears to be a placeholder" : "Key is not set"
    );
    return null;
  }

  try {
    console.log("Attempting to load Stripe with valid key");
    const stripePromise = loadStripe(stripeKey);
    console.log("Stripe loaded successfully");
    return stripePromise;
  } catch (error) {
    console.error("Error loading Stripe:", error);
    return null;
  }
};

// Price IDs with better error handling
export const STRIPE_PRICE_IDS = {
  MONTHLY:
    process.env.STRIPE_MONTHLY_PRICE_ID || "price_1RM2jgEAkEk7AeWQsfwaHtwb",
  YEARLY:
    process.env.STRIPE_YEARLY_PRICE_ID || "price_1RM2jgEAkEk7AeWQsfwaHtwb",
};

// Validate price IDs
export const validatePriceIds = () => {
  // Check if price IDs exist and are not placeholders
  const hasPlaceholder =
    !process.env.STRIPE_MONTHLY_PRICE_ID ||
    !process.env.STRIPE_YEARLY_PRICE_ID ||
    process.env.STRIPE_MONTHLY_PRICE_ID.includes("YourMonthly") ||
    process.env.STRIPE_YEARLY_PRICE_ID.includes("YourYearly");

  // If using fallback values from config, return true as they're valid
  if (
    hasPlaceholder &&
    STRIPE_PRICE_IDS.MONTHLY.startsWith("price_") &&
    STRIPE_PRICE_IDS.YEARLY.startsWith("price_")
  ) {
    console.log("Using fallback Stripe price IDs from config.");
    return true;
  }

  if (hasPlaceholder) {
    console.warn(
      "Using placeholder Stripe price IDs. Update environment variables with real price IDs."
    );
    return false;
  }

  return true;
};

// Subscription status type
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid"
  | "inactive";

// Subscription tier type
export type SubscriptionTier = "free" | "pro";

// User subscription data interface
export interface UserSubscription {
  customerId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

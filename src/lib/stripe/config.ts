import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with your publishable key
export const getStripe = () => {
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Check if we have a valid key (not undefined or a placeholder)
  if (!stripeKey || stripeKey.includes("YourTest") || stripeKey.endsWith("%")) {
    console.warn(
      "Invalid or missing Stripe publishable key:",
      stripeKey ? "Key appears to be a placeholder" : "Key is not set"
    );
    return null;
  }

  try {
    const stripePromise = loadStripe(stripeKey);
    return stripePromise;
  } catch (error) {
    console.error("Error loading Stripe:", error);
    return null;
  }
};

// Price IDs with better error handling
export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
  YEARLY: process.env.STRIPE_YEARLY_PRICE_ID || "price_yearly",
};

// Validate price IDs
export const validatePriceIds = () => {
  const hasPlaceholder =
    !process.env.STRIPE_MONTHLY_PRICE_ID ||
    !process.env.STRIPE_YEARLY_PRICE_ID ||
    process.env.STRIPE_MONTHLY_PRICE_ID.includes("YourMonthly") ||
    process.env.STRIPE_YEARLY_PRICE_ID.includes("YourYearly");

  if (hasPlaceholder) {
    console.warn(
      "Using placeholder Stripe price IDs. Update environment variables with real price IDs."
    );
    return false;
  }
  return true;
};

// Subscription status types
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "trialing"
  | "incomplete";

// Subscription tier types
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

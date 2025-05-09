/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Stripe Configuration - Using actual values from env
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

    // Stripe Price IDs - Using values from sample-seed.json
    STRIPE_MONTHLY_PRICE_ID: "price_1RM311EAkEk7AeWQBKwfeYxy", // Monthly price ID
    STRIPE_YEARLY_PRICE_ID: "price_1RLht5EAkEk7AeWQgRQmeWcF", // Yearly price ID
  },

  // Configure asset prefix for proper static file loading with subdomains
  assetPrefix: process.env.NODE_ENV === "development" ? undefined : undefined,

  // Configure base path
  basePath: "",

  // Update images configuration for domains
  images: {
    domains: ["localhost", "app.localhost"],
  },

  // Allow Stripe checkout in localhost development
  async headers() {
    return [
      {
        source: "/api/stripe/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      // Add CORS headers for all static assets
      {
        source: "/_next/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;

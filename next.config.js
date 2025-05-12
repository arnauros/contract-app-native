/** @type {import('next').NextConfig} */
import webpack from "webpack";

const nextConfig = {
  // Enable webpack 5 features
  reactStrictMode: true,
  transpilePackages: ["firebase-admin"],
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
    domains: ["localhost"],
  },

  // Redirect configuration
  async rewrites() {
    return {
      beforeFiles: [],
    };
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

  // Configure webpack for Node.js built-in modules
  webpack: (config, { isServer }) => {
    // Only apply polyfills in client-side browser bundles
    if (!isServer) {
      // Fix the node: scheme by using externals config
      config.externals = [
        ...(config.externals || []),
        (context, request, callback) => {
          // Handle node: protocol imports
          if (request.startsWith("node:")) {
            const moduleName = request.slice(5);
            return callback(null, `commonjs ${moduleName}`);
          }
          callback();
        },
      ];

      // Set up module replacements
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        stream: "stream-browserify",
        buffer: "buffer",
        util: "util",
        process: "process/browser",
      };

      // Add needed globals
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: "process/browser",
          Buffer: ["buffer", "Buffer"],
        })
      );
    }

    return config;
  },
};

export default nextConfig;

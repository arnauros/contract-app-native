/** @type {import('next').NextConfig} */
import webpack from "webpack";

const nextConfig = {
  // Enable webpack 5 features
  reactStrictMode: true,
  transpilePackages: ["firebase-admin"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    // Stripe Configuration - Using actual values from env
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

    // Stripe Price IDs - Using TEST mode IDs from the environment variables
    STRIPE_MONTHLY_PRICE_ID:
      process.env.STRIPE_MONTHLY_PRICE_ID || "price_1RM2jgEAkEk7AeWQsfwaHtwb", // Test mode monthly price
    STRIPE_YEARLY_PRICE_ID:
      process.env.STRIPE_YEARLY_PRICE_ID || "price_1RM2jgEAkEk7AeWQsfwaHtwb", // Test mode yearly price
  },

  // Server runtime configuration
  serverRuntimeConfig: {
    port: 3000,
  },

  // Configure asset prefix for proper static file loading with subdomains
  assetPrefix: process.env.NODE_ENV === "development" ? undefined : undefined,

  // Configure base path
  basePath: "",

  // Disable experimental features that might cause issues
  experimental: {
    optimizeCss: false,
  },

  // Update images configuration for domains
  images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Allow Stripe checkout in localhost development
  async headers() {
    return [
      {
        // Add Content-Security-Policy header for the entire site
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Allow all connections for debugging purposes
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com https://va.vercel-scripts.com; connect-src 'self' https://*.stripe.com https://*.googleapis.com https://*.firebase.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://*.cloudfunctions.net https://api.ipify.org https://va.vercel-scripts.com; frame-src 'self' https://*.stripe.com; img-src 'self' data: https://*.stripe.com https://www.google.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;",
          },
        ],
      },
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
      {
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
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

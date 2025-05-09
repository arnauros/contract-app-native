/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set the directory structure
  distDir: ".next",

  // Define experimental features
  experimental: {
    // appDir is now the default in Next.js 15+ so we can remove it
    turbo: {
      rules: {
        // Enable environment variables in Turbopack
        environment: ["NEXT_PUBLIC_*"],
      },
    },
  },

  // Ensure proper HTML generation
  reactStrictMode: true,
  poweredByHeader: false,

  // Add proper static asset handling
  output: "standalone",

  // Add proper CSS asset handling
  optimizeFonts: true,

  // Disable automatic redirect for trailing slashes
  trailingSlash: false,

  // Add hostname support to ensure correct domain routing
  // This is important for handling subdomain and localhost variants
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // Remove static assetPrefix to allow dynamic port detection
  // Next.js will automatically use the correct port
  assetPrefix: undefined,

  // Ensure proper static files serving
  images: {
    domains: ["localhost", "app.localhost"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Enable cross-origin isolation for better security
  crossOrigin: "anonymous",
};

export default nextConfig;

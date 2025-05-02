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

  // Rewrites and redirects removed - letting the RouteGuard handle authentication-based routing

  // Add assetPrefix if needed for cross-domain assets
  assetPrefix: process.env.NODE_ENV === "production" ? undefined : undefined,

  // Disable automatic redirect for trailing slashes
  trailingSlash: false,

  // Add hostname support to ensure correct domain routing
  // This is important for handling subdomain and localhost variants
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;

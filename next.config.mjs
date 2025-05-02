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
};

export default nextConfig;

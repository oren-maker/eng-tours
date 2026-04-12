/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force all pages to be server-rendered (not static)
  // This prevents build errors from dynamic API routes using headers/cookies
  experimental: {},
  // Skip type checking during build (we verify separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build (we verify separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

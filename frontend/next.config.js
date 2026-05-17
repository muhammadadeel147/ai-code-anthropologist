/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build a standalone output so Docker can copy the runnable app from .next/standalone
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:4000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

// Made with Bob

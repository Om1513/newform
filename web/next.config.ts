import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['chart.js', 'chartjs-node-canvas'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4000'}/api/:path*`
      },
      {
        source: '/reports/:path*',
        destination: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4000'}/reports/:path*`
      }
    ];
  },
  env: {
    API_BASE: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4000'
  }
};

export default nextConfig;

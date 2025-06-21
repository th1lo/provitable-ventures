import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.tarkov.dev',
      },
      {
        protocol: 'https',
        hostname: 'static.tarkov.dev',
      },
      {
        protocol: 'https',
        hostname: 'tarkov.dev',
      },
      {
        protocol: 'https',
        hostname: '**.tarkov.dev',
      },
      {
        protocol: 'https',
        hostname: 'eft.db',
      },
      {
        protocol: 'https',
        hostname: 'static.eft.db',
      }
    ],
  },
};

export default nextConfig;

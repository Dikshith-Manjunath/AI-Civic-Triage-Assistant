import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images from google (for Stitch design references)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // node:sqlite is built-in to Node 24 — no native modules needed
  serverExternalPackages: [],
};

export default nextConfig;

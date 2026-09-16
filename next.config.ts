import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  // Instant redirect — avoids RSC + root loading delay on `/`
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/hr",
        destination: "/hr/dashboard",
        permanent: false,
      },
    ];
  },
  // Direct static assets on Amplify (avoids slow /_next/image optimization path)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

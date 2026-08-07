import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["argon2", "@prisma/client", "bullmq", "ioredis", "@resvg/resvg-js", "satori"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mimimami.cz" },
      { protocol: "https", hostname: "*.elkafashion.cz" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["argon2", "@prisma/client", "bullmq", "ioredis"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mimimami.cz" },
      { protocol: "https", hostname: "*.elkafashion.cz" },
    ],
  },
};

export default nextConfig;

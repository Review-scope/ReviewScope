import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from monorepo root
// When running from src: apps/dashboard -> apps -> root (2 levels)
config({ path: resolve(__dirname, "../../.env") });

// When running from standalone: apps/dashboard/.next/standalone/apps/dashboard -> ... -> root (5 levels)
config({ path: resolve(__dirname, "../../../../../.env") });

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    cpus: 1
  }
};

export default nextConfig;

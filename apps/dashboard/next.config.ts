import type { NextConfig } from "next";
import { resolve } from "path";


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

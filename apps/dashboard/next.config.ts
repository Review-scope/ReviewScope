import type { NextConfig } from "next";
import { resolve } from "path";


const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@reviewscope/security', '@reviewscope/llm-core', '@reviewscope/rules-engine', '@reviewscope/context-engine'],
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    cpus: 1
  }
};

export default nextConfig;

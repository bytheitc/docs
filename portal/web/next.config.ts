import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // keep strict mode on; it catches double-render bugs before prod does
};

export default nextConfig;

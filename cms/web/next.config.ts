import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // no X-Powered-By, and no extra response headers leaking the stack either
};

export default nextConfig;

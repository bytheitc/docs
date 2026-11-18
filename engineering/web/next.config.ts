import type { NextConfig } from "next";

// Security headers, set for every response. The CSP is static (no nonces) so pages keep static
// rendering and ISR: next/font self-hosts every font, and the only other origin is analytics (its
// script and beacon, when NEXT_PUBLIC_ANALYTICS_URL is set). 'unsafe-inline' for scripts is what
// Next's inline hydration payload needs without nonces; everything else is locked to this origin.
// It applies in production only: `next dev` needs eval and a websocket for fast refresh.
const isProd = process.env.NODE_ENV === "production";
// The one third-party origin a page may use: the collective's analytics, for its script and beacon.
const analyticsOrigin = process.env.NEXT_PUBLIC_ANALYTICS_URL ? new URL(process.env.NEXT_PUBLIC_ANALYTICS_URL).origin : "";
const withAnalytics = (src: string) => (analyticsOrigin ? `${src} ${analyticsOrigin}` : src);

const csp = [
  "default-src 'self'",
  withAnalytics("script-src 'self' 'unsafe-inline'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  withAnalytics("connect-src 'self'"),
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  ...(isProd
    ? [
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

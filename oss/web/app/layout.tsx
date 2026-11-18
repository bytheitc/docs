import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, Space_Mono, Reem_Kufi } from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["700"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("oss").url),
  title: { default: "ITC Open Source", template: "%s · ITC Open Source" },
  description: "Open Source at the Islamic Tech Collective. Fork it. Fix it. Ship it.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${spaceGrotesk.variable} ${inter.variable} ${spaceMono.variable} ${reemKufi.variable}`}>
      <body>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

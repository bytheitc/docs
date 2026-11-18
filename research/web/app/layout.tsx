import type { Metadata } from "next";
import Script from "next/script";
import { Newsreader, Inter_Tight, Reem_Kufi } from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-newsreader" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("research").url),
  title: { default: "ITC Research", template: "%s · ITC Research" },
  description: "Research at the Islamic Tech Collective: careful questions, published in the open.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${interTight.variable} ${reemKufi.variable}`}>
      <body>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

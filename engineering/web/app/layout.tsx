import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Sans, IBM_Plex_Mono, Reem_Kufi } from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("engineering").url),
  title: { default: "ITC Engineering", template: "%s · ITC Engineering" },
  description: "Engineering at the Islamic Tech Collective: build it right, then build it to last.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${reemKufi.variable}`}>
      <body>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

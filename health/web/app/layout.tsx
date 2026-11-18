import type { Metadata } from "next";
import Script from "next/script";
import { Newsreader, Inter, Reem_Kufi } from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

// The house's voice: a quiet serif for headings, a plain sans for everything else. Health writing
// has to be read carefully by someone who may be tired or worried, so nothing here is clever.
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["500"], variable: "--font-arabic" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("health").url),
  title: { default: "ITC Health", template: "%s · ITC Health" },
  description: "Health technology built for the places that cannot pay for it, by the Islamic Tech Collective.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${reemKufi.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Work_Sans, Reem_Kufi } from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("institute").url),
  title: { default: "The Institute · ITC", template: "%s · The Institute · ITC" },
  description: "The Institute for the Centers at the Islamic Tech Collective: a home for the centers that carry the work forward.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${workSans.variable} ${reemKufi.variable}`}>
      <body>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

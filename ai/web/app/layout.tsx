import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, JetBrains_Mono, Reem_Kufi } from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("ai").url),
  title: { default: "AI at ITC", template: "%s · AI at ITC" },
  description: "AI at the Islamic Tech Collective: intelligence, with intention.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrains.variable} ${reemKufi.variable}`}>
      <body>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

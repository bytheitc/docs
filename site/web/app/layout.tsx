import type { Metadata } from "next";
import Script from "next/script";
import {
  Fraunces, Manrope, Reem_Kufi,
  // The Collective hub previews every house in that house's own typeface.
  Space_Grotesk, IBM_Plex_Sans, Cormorant_Garamond, Archivo_Black, Newsreader,
} from "next/font/google";
import { house } from "@/lib/houses";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--font-space-grotesk" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["600"], variable: "--font-plex-sans" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500"], style: ["italic"], variable: "--font-cormorant" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["500"], variable: "--font-newsreader" });

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and Twitter image URLs.
  metadataBase: new URL(house("site").url),
  title: { default: "Islamic Tech Collective", template: "%s · Islamic Tech Collective" },
  description: "Five houses building technology with intention, in service of people.",
};

// Page views go to the collective's own analytics (analytics/), cookieless. Both values are baked in
// at build time; with either missing no script loads and nothing is counted.
const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/+$/, "");
const analyticsSite = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [fraunces, manrope, reemKufi, spaceGrotesk, plexSans, cormorant, archivoBlack, newsreader]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fonts}>
      <body>
        {children}
        {analyticsUrl && analyticsSite ? <Script src={`${analyticsUrl}/script.js`} data-site={analyticsSite} strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}

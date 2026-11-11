import type { Metadata } from "next";
import {
  Archivo_Black, Cormorant_Garamond, Fraunces, IBM_Plex_Mono, IBM_Plex_Sans, Inter_Tight, JetBrains_Mono, Manrope,
  Newsreader, Space_Grotesk, Space_Mono, Work_Sans,
} from "next/font/google";
import "./admin.css";
import "./themes.css";

// Every house theme's fonts, under the CSS variable names the house themes use.
// Only the neutral theme's (Fraunces + Manrope) are preloaded; the rest load when a themed page uses them.
const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", preload: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", preload: false });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", preload: false });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant", preload: false });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", preload: false });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black", preload: false });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], variable: "--font-newsreader", preload: false });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", preload: false });

const FONTS = [fraunces, manrope, spaceGrotesk, jetbrains, plexSans, plexMono, cormorant, workSans, archivoBlack, spaceMono, newsreader, interTight]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: { default: "ITC CMS", template: "%s · ITC CMS" },
  description: "Content management for the Islamic Tech Collective's houses.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={FONTS}>
      <body>{children}</body>
    </html>
  );
}

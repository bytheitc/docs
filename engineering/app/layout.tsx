import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Reem_Kufi } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  title: { default: "ITC Engineering", template: "%s · ITC Engineering" },
  description: "Engineering at the Islamic Tech Collective: build it right, then build it to last.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}

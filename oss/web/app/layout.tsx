import type { Metadata } from "next";
import { Space_Grotesk, Inter, Space_Mono, Reem_Kufi } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["700"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  title: { default: "ITC Open Source", template: "%s · ITC Open Source" },
  description: "Open Source at the Islamic Tech Collective. Fork it. Fix it. Ship it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${spaceGrotesk.variable} ${inter.variable} ${spaceMono.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}

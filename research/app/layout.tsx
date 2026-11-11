import type { Metadata } from "next";
import { Newsreader, Inter_Tight, Reem_Kufi } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-newsreader" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  title: { default: "ITC Research", template: "%s · ITC Research" },
  description: "Research at the Islamic Tech Collective: careful questions, published in the open.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${interTight.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}

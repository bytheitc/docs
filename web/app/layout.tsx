import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, Reem_Kufi } from "next/font/google";
import { themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

const SITE = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.bytheitc.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "ITC Docs", template: "%s · ITC Docs" },
  description: "How to contribute to the Islamic Tech Collective, and what we build.",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fdfcf9" }, { media: "(prefers-color-scheme: dark)", color: "#0f1513" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${reemKufi.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

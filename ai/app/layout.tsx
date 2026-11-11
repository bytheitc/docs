import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Reem_Kufi } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  title: { default: "AI at ITC", template: "%s · AI at ITC" },
  description: "AI at the Islamic Tech Collective: intelligence, with intention.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrains.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}

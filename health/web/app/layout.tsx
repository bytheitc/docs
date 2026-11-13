import type { Metadata } from "next";
import { Newsreader, Inter, Reem_Kufi } from "next/font/google";
import "./globals.css";

// The house's voice: a quiet serif for headings, a plain sans for everything else. Health writing
// has to be read carefully by someone who may be tired or worried, so nothing here is clever.
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["500"], variable: "--font-arabic" });

export const metadata: Metadata = {
  title: { default: "ITC Health", template: "%s · ITC Health" },
  description: "Health technology built for the places that cannot pay for it, by the Islamic Tech Collective.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${reemKufi.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}

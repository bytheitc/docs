import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans, Reem_Kufi } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  title: { default: "The Institute · ITC", template: "%s · The Institute · ITC" },
  description: "The Institute for the Centers at the Islamic Tech Collective: a home for the centers that carry the work forward.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${workSans.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}

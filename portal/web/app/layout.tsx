import type { Metadata } from "next";
import { Fraunces, Manrope, Reem_Kufi } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], variable: "--font-reem-kufi" });

export const metadata: Metadata = {
  title: { default: "Contributor Portal · Islamic Tech Collective", template: "%s · ITC Contributor Portal" },
  description: "Connect the platforms you contribute on and see your work for every ITC house, privately.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}

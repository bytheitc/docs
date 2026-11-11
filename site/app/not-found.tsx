import type { Metadata } from "next";
import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CollectiveBar } from "@/components/CollectiveBar";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <>
    <a href="#main" className="skip-link">Skip to content</a>
    <SiteHeader />
    <main id="main">
    <section className="lost">
      <Khatam variant="site" className="lost-mark" strokeWidth={1.5} accent="var(--gold)" />
      <p className="eyebrow">404 · Not found</p>
      <h1>This path has wandered <em>from the circle</em>.</h1>
      <p className="lede">The page you were looking for isn&rsquo;t here. It may have moved, or it may not exist yet. Let&rsquo;s bring you back to the center.</p>
      <div className="hero-ctas center">
        <Link href="/" className="btn">Return home</Link>
        <Link href="/houses" className="btn btn-ghost">Find a house →</Link>
      </div>
      <ul className="lost-links">
        <li><Link href="/about">About</Link></li>
        <li><Link href="/events">Gatherings</Link></li>
        <li><Link href="/news">News</Link></li>
        <li><Link href="/contact">Contact</Link></li>
      </ul>
    </section>
    </main>
    <SiteFooter />
    <CollectiveBar current="site" title="Islamic Tech Collective" />
    </>
  );
}

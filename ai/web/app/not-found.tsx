import type { Metadata } from "next";
import Link from "next/link";
import { UnknownPath } from "@/components/UnknownPath";
import { Lattice } from "@/components/Lattice";
import { SiteHeader } from "@/components/SiteHeader";
import { CollectiveBar } from "@/components/CollectiveBar";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist on AI at ITC.",
};

export default function NotFound() {
  // Sits outside the (site) group, so it renders the public chrome itself.
  return (
    <>
    <a href="#main" className="skip">skip to content</a>
    <Lattice />
    <SiteHeader />
    <main id="main">
    <section className="nf">
      <p className="eyebrow">404 · not found</p>
      <h1>I don&apos;t <span className="grad">know this page.</span></h1>
      <div className="demo nf-demo">
        <div className="demo-bar">
          <span className="lights"><i /><i /><i /></span>
          <span className="demo-title">itc-assistant · principles mode</span>
          <span className="demo-badge">404</span>
        </div>
        <div className="demo-body">
          <div className="msg user"><span className="who">you ›</span><span className="txt">Take me to <UnknownPath /></span></div>
          <div className="msg ai">
            <span className="who">itc ›</span>
            <span className="txt">I can&apos;t find that page, and I&apos;d rather tell you so than guess at what it might have said. It may have moved, or it may never have existed.{"\n\n"}Here is where I can point you instead.</span>
          </div>
        </div>
      </div>
      <nav className="nf-links" aria-label="Suggested pages">
        <Link href="/">home</Link>
        <Link href="/projects">projects</Link>
        <Link href="/evals">evals</Link>
        <Link href="/charter">charter</Link>
        <Link href="/guides">guides</Link>
      </nav>
    </section>
    </main>
    <CollectiveBar current="ai" />
    </>
  );
}

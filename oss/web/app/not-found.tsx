import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "404",
};

export default function NotFound() {
  return (
    <SiteChrome>
    <section className="nf">
      <p className="kicker">ERROR 404 · PAGE NOT FOUND</p>
      <h1>
        <span>404.</span>
        <span>NOTHING HERE.</span>
        <span className="hl">YET.</span>
      </h1>
      <p className="nf-body">Either the link is broken or this page hasn&apos;t been built. Both are fixable. Open an issue, or better, open a PR.</p>
      <div className="head-actions">
        <Link href="/" className="btn">← BACK HOME</Link>
        <Link href="/projects" className="btn btn-ghost">BROWSE PROJECTS</Link>
        <Link href="/contribute" className="btn btn-ghost">OPEN AN ISSUE →</Link>
      </div>
    </section>
    </SiteChrome>
  );
}

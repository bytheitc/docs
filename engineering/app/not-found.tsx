import type { Metadata } from "next";
import Link from "next/link";
import { KHATAM_POINTS } from "@/components/Khatam";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = { title: "Sheet not found" };

export default function NotFound() {
  return (
    <SiteShell>
    <section className="nf grid">
      <div className="nf-copy">
        <p className="kicker mono">ITC / ENG / 404 · Drawing register</p>
        <h1>Sheet not found.</h1>
        <p className="lede">
          This sheet is not in the drawing register. It may have been renumbered, superseded, or never issued.
        </p>
        <dl className="spec-dl">
          <div><dt className="mono">Error</dt><dd className="mono">404 · no such sheet</dd></div>
          <div><dt className="mono">Action</dt><dd>Check the reference, or start again from the index.</dd></div>
        </dl>
        <div className="nf-actions">
          <Link className="btn" href="/">Title sheet →</Link>
          <Link className="btn line" href="/platforms">Platforms</Link>
          <Link className="btn line" href="/handbook">Handbook</Link>
        </div>
      </div>
      <figure className="nf-fig" aria-hidden="true">
        <svg viewBox="-10 -10 120 120">
          <g className="c-guide">
            <circle cx="50" cy="50" r="42.43" />
            <line x1="-6" y1="50" x2="106" y2="50" />
            <line x1="50" y1="-6" x2="50" y2="106" />
          </g>
          <polygon points={KHATAM_POINTS} className="nf-star" />
          <text x="50" y="54" textAnchor="middle" className="nf-q">?</text>
        </svg>
        <figcaption className="mono">FIG. 404 · outline only: the sheet was never drawn</figcaption>
      </figure>
    </section>
    </SiteShell>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { CardArch } from "@/components/Arch";
import { AREAS, type Area, type Center } from "@/lib/centers";

const FILTERS: ("All" | Area)[] = ["All", ...AREAS];

export function CenterCard({ c }: { c: Center }) {
  return (
    <Link href={`/centers/${c.slug}`} className="center">
      <div className="center-arch">
        <CardArch id={`card-${c.slug}`} />
        <div className="center-arch-text">
          <span className="center-ar" lang="ar">{c.arabic}</span>
          <span className="center-tr">{c.translit}</span>
        </div>
      </div>
      <div className="center-body">
        <p className="center-area">{c.area}</p>
        <h3>{c.name}</h3>
        <p>{c.focus}</p>
        <ul aria-label="Programs">{c.programs.slice(0, 2).map((p) => <li key={p.name}>{p.name}</li>)}</ul>
        <span className="center-more" aria-hidden="true">Enter the center →</span>
      </div>
    </Link>
  );
}

/** The filterable grid of centers, used on the home page and on /centers. Server pages pass the published centers in. */
export function Centers({ centers }: { centers: Center[] }) {
  const [area, setArea] = useState<(typeof FILTERS)[number]>("All");
  const shown = area === "All" ? centers : centers.filter((c) => c.area === area);

  return (
    <>
      <div className="filters" role="group" aria-label="Filter centers by area">
        {FILTERS.map((a) => (
          <button key={a} type="button" aria-pressed={area === a} className={area === a ? "on" : undefined} onClick={() => setArea(a)}>
            {a}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "center" : "centers"}{area === "All" ? "" : ` in ${area}`}.
      </p>
      <div className="centers">
        {shown.map((c) => (
          <CenterCard key={c.slug} c={c} />
        ))}
      </div>
    </>
  );
}

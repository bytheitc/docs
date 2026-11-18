"use client";
import { useEffect, useState } from "react";
import type { Heading } from "@/lib/api";

/** "On this page", marking the section being read. */
export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => Boolean(e));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [headings]);
  if (headings.length < 2) return <aside className="toc" aria-hidden="true" />;
  return (
    <aside className="toc" aria-label="On this page">
      <p>On this page</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className={`d${h.depth}${active === h.id ? " on" : ""}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Khatam } from "@/components/Khatam";
import { NAV_LEFT, NAV_RIGHT, type NavLink } from "@/lib/nav";

/** The Institute masthead: navigation split symmetrically around the centered mark. */
export function Masthead() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const links = (list: NavLink[]) =>
    list.map((l) => (
      <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
        {l.label}
      </Link>
    ));

  return (
    <header className="masthead">
      <nav className="mh-left" aria-label="Institute, first half">{links(NAV_LEFT)}</nav>
      <Link href="/" className="mh-brand" aria-label="The Institute home" aria-current={pathname === "/" ? "page" : undefined} onClick={() => setOpen(false)}>
        <Khatam variant="institute" className="mark" strokeWidth={3.5} accent="var(--gold)" />
        <span className="mh-name">Institute</span>
        <span className="mh-sub">for the Centers · Islamic Tech Collective</span>
      </Link>
      <nav className="mh-right" aria-label="Institute, second half">{links(NAV_RIGHT)}</nav>

      <button type="button" className="mh-toggle" aria-expanded={open} aria-controls="mh-menu" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">✦</span> {open ? "Close" : "Menu"} <span aria-hidden="true">✦</span>
      </button>
      <nav id="mh-menu" className="mh-menu" aria-label="Institute" hidden={!open}>
        {links([...NAV_LEFT, ...NAV_RIGHT])}
      </nav>
    </header>
  );
}

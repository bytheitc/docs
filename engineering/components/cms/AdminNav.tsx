"use client";
// Admin sidebar navigation with current-page marking and a mobile toggle. Identical in every app.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AdminNav({ links }: { links: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const active = (href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`));

  return (
    <>
      <button type="button" className="cms-navtoggle" aria-expanded={open} aria-controls="cms-nav" onClick={() => setOpenOn(open ? null : path)}>
        {open ? "Close menu" : "Menu"}
      </button>
      <nav id="cms-nav" className={`cms-nav${open ? " open" : ""}`} aria-label="Admin">
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={active(l.href) ? "page" : undefined} onClick={() => setOpenOn(null)}>
                <span>{l.label}</span>
                {l.badge ? <span className="cms-badge" aria-label={`${l.badge} new`}>{l.badge}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

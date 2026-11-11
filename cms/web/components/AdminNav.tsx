"use client";
// Sidebar navigation with current-page marking and a mobile toggle (ported from the per-app kit).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavLink {
  href: string;
  label: string;
  badge?: number;
  /** Mark as current only on an exact match (overview pages). */
  exact?: boolean;
  /** Opens outside the CMS (a space's registered links). */
  external?: boolean;
  /** Starts a new group with a small heading. */
  group?: string;
}

export function AdminNav({ links, label = "CMS" }: { links: NavLink[]; label?: string }) {
  const path = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const active = (l: NavLink) => !l.external && (l.exact ? path === l.href : path === l.href || path.startsWith(`${l.href}/`));

  return (
    <>
      <button type="button" className="cms-navtoggle" aria-expanded={open} aria-controls="cms-nav" onClick={() => setOpenOn(open ? null : path)}>
        {open ? "Close menu" : "Menu"}
      </button>
      <nav id="cms-nav" className={`cms-nav${open ? " open" : ""}`} aria-label={label}>
        <ul>
          {links.map((l) => (
            <li key={`${l.group ?? ""}${l.href}`}>
              {l.group && <p className="cms-nav-group">{l.group}</p>}
              {l.external ? (
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  <span>{l.label}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <Link href={l.href} aria-current={active(l) ? "page" : undefined} onClick={() => setOpenOn(null)}>
                  <span>{l.label}</span>
                  {l.badge ? <span className="cms-badge" aria-label={`${l.badge} new`}>{l.badge}</span> : null}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

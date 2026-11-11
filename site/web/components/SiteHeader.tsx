"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Khatam } from "@/components/Khatam";
import { PRIMARY_NAV } from "@/lib/nav";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={`nav${open ? " nav-open" : ""}`}>
      <Link href="/" className="brand" aria-label="Islamic Tech Collective home">
        <Khatam variant="site" className="mark" strokeWidth={6} />
        <span className="wordmark">Islamic Tech Collective</span>
      </Link>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle-bars" aria-hidden="true" />
        <span>{open ? "Close" : "Menu"}</span>
      </button>
      <nav id="site-nav" className="nav-links" aria-label="Main">
        {PRIMARY_NAV.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
        <Link href="/join" className="btn btn-small" aria-current={isCurrent("/join") ? "page" : undefined}>
          Join the Collective
        </Link>
      </nav>
    </header>
  );
}

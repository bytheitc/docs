"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Khatam } from "@/components/Khatam";

const LINKS = [
  { href: "/projects", label: "projects" },
  { href: "/evals", label: "evals" },
  { href: "/model-cards", label: "model cards" },
  { href: "/guides", label: "guides" },
  { href: "/charter", label: "charter" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={`nav${open ? " open" : ""}`}>
      <Link href="/" className="brand" aria-label="ITC AI home">
        <Khatam variant="ai" className="mark" accent="var(--turquoise)" />
        <span className="wordmark">ITC<span className="slash">/</span>AI</span>
      </Link>
      <nav className="nav-links" id="site-nav" aria-label="AI at ITC">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : undefined} aria-current={isActive(l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="nav-end">
        <Link href="/collaborate" className="pill" aria-current={isActive("/collaborate") ? "page" : undefined}>collaborate</Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

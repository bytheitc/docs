"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Khatam } from "@/components/Khatam";
import { NAV } from "@/lib/site";

export function SiteHeader({ githubUrl, accountName }: { githubUrl: string; accountName?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={`topbar${open ? " is-open" : ""}`}>
      <Link href="/" className="brand" aria-label="ITC Open Source home" onClick={() => setOpen(false)}>
        <Khatam variant="oss" className="mark" strokeWidth={9} accent="var(--mint)" />
        <span>ITC//OSS</span>
      </Link>
      <nav id="site-nav" aria-label="Main">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n.href) ? "page" : undefined}
            className={isActive(n.href) ? "on" : undefined}
            onClick={() => setOpen(false)}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "CLOSE ×" : "MENU +"}
      </button>
      {/* TODO(launch): set the real GitHub organisation URL in the admin (Site settings) */}
      <a className="gh" href={githubUrl} rel="noreferrer">GITHUB ↗</a>
      <Link href="/account" className="gh" onClick={() => setOpen(false)}>
        {accountName ? `@${accountName}` : "SIGN IN"}
      </Link>
    </header>
  );
}

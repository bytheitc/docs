"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Khatam } from "@/components/Khatam";
import { usePageIndex } from "@/components/PageIndex";
import type { NavItem } from "@/lib/nav";

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

// Fixed docs-style sidebar: site sheets, the current sheet's sub-pages,
// and an "on this page" index with scroll-spy when the page declares one.
export function Sidebar({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const sections = usePageIndex();
  const [active, setActive] = useState<string | undefined>(undefined);
  // The mobile index is open only for the path it was opened on, so navigating closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const close = () => setOpenFor(null);
  const spy = active && sections.some((s) => s.id === active) ? active : sections[0]?.id;

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sb-head">
        <Link href="/" className="brand" aria-label="ITC Engineering home">
          <Khatam variant="engineering" className="mark" strokeWidth={5} accent="var(--saffron)" />
          <span className="wordmark"><b>ITC</b> Engineering</span>
        </Link>
        <button
          type="button"
          className="sb-toggle"
          aria-expanded={open}
          aria-controls="sb-nav"
          onClick={() => setOpenFor(open ? null : pathname)}
        >
          {open ? "Close" : "Index"}
        </button>
      </div>
      <div id="sb-nav" className="sb-nav">
        <nav aria-label="Site">
          <p className="sb-label">Sheets</p>
          <ol>
            {nav.map((item) => {
              const on = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={on ? "active" : undefined}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={close}
                  >
                    <span className="sb-num">{item.num}</span>
                    {item.label}
                  </Link>
                  {on && item.children && (
                    <ul className="sb-sub">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className={pathname === c.href ? "current" : undefined}
                            aria-current={pathname === c.href ? "page" : undefined}
                            onClick={close}
                          >
                            <span className="sb-code">{c.code}</span>
                            <span>{c.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {sections.length > 0 && (
          <nav className="sb-onpage" aria-label="On this page">
            <p className="sb-label">On this page</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={spy === s.id ? "spy" : undefined} onClick={close}>
                    <span className="sb-num">{s.num}</span>
                    <span>{s.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="sb-foot">
          <p className="sb-label">Revision</p>
          <p className="mono">rev. 0.2 · draft</p>
        </div>
      </div>
    </aside>
  );
}

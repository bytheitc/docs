"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/publications", label: "Publications" },
  { href: "/datasets", label: "Datasets" },
  { href: "/groups", label: "Groups" },
  { href: "/notes", label: "Notes" },
  { href: "/people", label: "People" },
  { href: "/open-science", label: "Open science" },
];

export function MastheadNav() {
  const path = usePathname() ?? "/";
  return (
    <nav className="mh-nav" aria-label="ITC Research">
      {LINKS.map((l) => {
        const on = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={on ? "on" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

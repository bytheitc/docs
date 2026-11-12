"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/contributions", label: "Contributions" },
  { href: "/dashboard/log", label: "Log work" },
  { href: "/dashboard/connections", label: "Connections" },
  { href: "/dashboard/profile", label: "Public profile" },
  { href: "/dashboard/data", label: "Your data" },
];

/** Shown only to people who hold something: most contributors never maintain a repository. */
const MAINTAINERS = { href: "/maintainers", label: "Maintainers" };

export function DashNav({ maintainer = false }: { maintainer?: boolean }) {
  const path = usePathname();
  const links = maintainer ? [...LINKS, MAINTAINERS] : LINKS;
  return (
    <nav className="dash-nav" aria-label="Dashboard">
      <ul>
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

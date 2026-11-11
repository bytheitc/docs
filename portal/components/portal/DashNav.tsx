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

export function DashNav() {
  const path = usePathname();
  return (
    <nav className="dash-nav" aria-label="Dashboard">
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}><Link href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Connected apps" },
  { href: "/account/security", label: "Security" },
  { href: "/developers", label: "Developers" },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="dash-nav" aria-label="Account">
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}><Link href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

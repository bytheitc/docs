"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutStaff } from "../actions";

const ITEMS = [
  { href: "/staff/lists", label: "Lists" },
  { href: "/staff/templates", label: "Templates" },
  { href: "/staff/campaigns", label: "Campaigns" },
  { href: "/staff/sending", label: "Sending" },
];

export function DashNav() {
  const pathname = usePathname();
  return (
    <nav className="dash-nav" aria-label="Email">
      <ul>
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={pathname.startsWith(i.href) ? "page" : undefined}>{i.label}</Link>
          </li>
        ))}
        <li>
          <form action={signOutStaff}>
            <button type="submit" className="linkbtn" style={{ padding: "9px 12px" }}>Sign out</button>
          </form>
        </li>
      </ul>
    </nav>
  );
}

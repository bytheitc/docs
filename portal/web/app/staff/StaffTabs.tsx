"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/staff", "Overview"], ["/staff/contributors", "Contributors"], ["/staff/contributions", "Contributions"],
  ["/staff/claims", "Claims"], ["/staff/maintainers", "Maintainers"], ["/staff/sync", "Sync"], ["/staff/providers", "Providers"], ["/staff/recognition", "Recognition"],
] as const;

export function StaffTabs() {
  const path = usePathname();
  const active = (h: string) => (h === "/staff" ? path === h : path === h || path.startsWith(`${h}/`));
  return (
    <nav className="pa-tabs" aria-label="Portal tools">
      {TABS.map(([h, l]) => <Link key={h} href={h} aria-current={active(h) ? "page" : undefined}>{l}</Link>)}
    </nav>
  );
}

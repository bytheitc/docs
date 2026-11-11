"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin/portal", "Overview"], ["/admin/portal/contributors", "Contributors"], ["/admin/portal/contributions", "Contributions"],
  ["/admin/portal/claims", "Claims"], ["/admin/portal/sync", "Sync"], ["/admin/portal/providers", "Providers"], ["/admin/portal/recognition", "Recognition"],
] as const;

export function PortalTabs() {
  const path = usePathname();
  const active = (h: string) => (h === "/admin/portal" ? path === h : path === h || path.startsWith(`${h}/`));
  return (
    <nav className="pa-tabs" aria-label="Portal administration">
      {TABS.map(([h, l]) => <Link key={h} href={h} aria-current={active(h) ? "page" : undefined}>{l}</Link>)}
    </nav>
  );
}

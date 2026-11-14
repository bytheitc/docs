import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { currentContributor } from "@/lib/session";
import { currentStaff } from "@/lib/staff-session";

export async function TopBar({ current }: { current?: "contributors" | "dashboard" | "sign-in" }) {
  const [me, staff] = await Promise.all([currentContributor(), currentStaff()]);
  const cur = (k: string) => (current === k ? "page" : undefined);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand" aria-label="ITC Contributor Portal, home">
          <Khatam variant="site" className="mark" strokeWidth={5} accent="var(--gold)" />
          <span className="brand-text">
            <span className="brand-name">Contributors</span>
            <span className="brand-sub">Islamic Tech Collective</span>
          </span>
        </Link>
        <nav className="topnav" aria-label="Portal">
          <Link href="/contributors" className="hide-sm" aria-current={cur("contributors")}>Contributors</Link>
          {staff && <Link href="/staff" className="hide-sm">Portal tools</Link>}
          {me ? (
            <Link href="/dashboard" className="btn small" aria-current={cur("dashboard")}>Dashboard</Link>
          ) : (
            <Link href="/sign-in" className="btn small">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

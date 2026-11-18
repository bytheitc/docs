import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { currentStaff } from "@/lib/staff-session";

export async function TopBar() {
  const me = await currentStaff();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand" aria-label="ITC Email, home">
          <Khatam variant="email" className="mark" strokeWidth={5} accent="var(--gold)" />
          <span className="brand-text">
            <span className="brand-name">ITC Email</span>
            <span className="brand-sub">Islamic Tech Collective</span>
          </span>
        </Link>
        <nav className="topnav" aria-label="Email">
          {me ? (
            <Link href="/staff/lists" className="btn small">{me.name}</Link>
          ) : (
            <Link href="/staff/sign-in" className="btn small">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

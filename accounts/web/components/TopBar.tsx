import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { currentAccount } from "@/lib/session";

export async function TopBar({ current }: { current?: "sign-in" | "account" }) {
  const me = await currentAccount();
  const cur = (k: string) => (current === k ? "page" : undefined);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand" aria-label="ITC Account, home">
          <Khatam variant="site" className="mark" strokeWidth={5} accent="var(--gold)" />
          <span className="brand-text">
            <span className="brand-name">ITC Account</span>
            <span className="brand-sub">Islamic Tech Collective</span>
          </span>
        </Link>
        <nav className="topnav" aria-label="Account">
          <Link href="/docs" className="hide-sm">Docs</Link>
          {me ? (
            <Link href="/account" className="btn small" aria-current={cur("account")}>Your account</Link>
          ) : (
            <Link href="/sign-in" className="btn small" aria-current={cur("sign-in")}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

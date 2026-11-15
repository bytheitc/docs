import Link from "next/link";
import { CollectiveBar } from "@/components/CollectiveBar";
import { Khatam } from "@/components/Khatam";

export default function NotFound() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/" className="brand">
            <Khatam variant="site" className="mark" strokeWidth={5} accent="var(--gold)" />
            <span className="brand-text"><span className="brand-name">ITC Account</span><span className="brand-sub">Islamic Tech Collective</span></span>
          </Link>
        </div>
      </header>
      <main id="main" className="narrow">
        <div className="card">
          <h1>Not found</h1>
          <p className="muted">There’s nothing at this address.</p>
          <p style={{ marginTop: 16 }}><Link href="/" className="btn">Back to your account</Link></p>
        </div>
      </main>
      <CollectiveBar current="accounts" title="Islamic Tech Collective · ITC Account" />
    </>
  );
}

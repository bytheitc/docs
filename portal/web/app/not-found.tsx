import Link from "next/link";
import { CollectiveBar } from "@/components/CollectiveBar";
import { Khatam } from "@/components/Khatam";

// Outside the (portal) group, so it renders its own chrome.
export default function NotFound() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/" className="brand">
            <Khatam variant="site" className="mark" strokeWidth={5} accent="var(--gold)" />
            <span className="brand-text"><span className="brand-name">Contributor Portal</span><span className="brand-sub">Islamic Tech Collective</span></span>
          </Link>
        </div>
      </header>
      <main id="main" className="narrow">
        <div className="card">
          <h1>Not found</h1>
          <p className="muted">There’s nothing at this address. If you followed a profile link, its owner may have made it private.</p>
          <p style={{ marginTop: 16 }}><Link href="/" className="btn">Back to the portal</Link></p>
        </div>
      </main>
      <CollectiveBar current="portal" title="Islamic Tech Collective · Contributor Portal" />
    </>
  );
}

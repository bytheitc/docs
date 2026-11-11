import Link from "next/link";
import { staff } from "@/lib/portal";
import { requireStaff } from "@/lib/staff-session";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Overview" };

export default async function StaffOverview() {
  const { token } = await requireStaff();
  const result = await staff.overview(token);
  if (!result.ok) return <p className="cms-flash bad" role="alert">{result.message}</p>;
  const n = result.counts;

  const cards = [
    { href: "/staff/contributors", n: n.contributors, label: "Contributors", sub: `${n.publicProfiles} public` },
    { href: "/staff/contributions?review=pending", n: n.pendingReviews, label: "To verify", sub: "self-logged entries" },
    { href: "/staff/contributions", n: n.contributions, label: "Contributions", sub: `${n.unmatched} not yet matched` },
    { href: "/staff/claims", n: n.activeClaims, label: "Active claims", sub: "issues being worked on" },
    { href: "/staff/sync", n: n.activeSources, label: "Active sources", sub: `${n.sources} published` },
    { href: "/staff/providers", n: n.providersLive, label: "Providers live", sub: "for sign-in" },
  ];

  return (
    <>
      <h1 style={{ fontFamily: "var(--cms-font-display)", fontSize: 32 }}>Portal overview</h1>
      <section className="cms-cards" aria-label="Portal">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="cms-card">
            <span className="cms-card-n">{c.n}</span><span className="cms-card-label">{c.label}</span><span className="cms-card-sub">{c.sub}</span>
          </Link>
        ))}
      </section>
      <section className="cms-panel">
        <h2>Recent sync runs</h2>
        {result.recentRuns.length ? (
          <ul className="cms-list">
            {result.recentRuns.map((r) => (
              <li key={r.id}>
                <span className="cms-mono">{r.sourceId}</span>{" "}
                <span className={`pa-chip ${r.status === "ok" ? "ok" : r.status === "error" ? "bad" : "warn"}`}>{r.status}</span>{" "}
                <span className="cms-muted">· {fmtDate(r.startedAt)} · {r.counts.fetched} fetched</span>
              </li>
            ))}
          </ul>
        ) : <p className="cms-muted">No syncs yet.</p>}
      </section>
    </>
  );
}

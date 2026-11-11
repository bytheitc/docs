import Link from "next/link";
import { requireUser } from "@/lib/cms/auth";
import { getSources } from "@/lib/data";
import { availableProviders } from "@/lib/providers";
import { requirePortalStore } from "@/lib/portal/store";

export const metadata = { title: "Portal" };

export default async function PortalOverview() {
  await requireUser("editor");
  const store = requirePortalStore();
  const [contributors, pending, total, unmatched, claims, runs, sources] = await Promise.all([
    store.listContributors(), store.countContributions({ provider: "self", reviewStatus: "pending" }), store.countContributions(),
    store.countContributions({ unmatchedOnly: true }), store.listClaims({ status: "active" }), store.listSyncRuns({ limit: 5 }), getSources(),
  ]);
  const cards = [
    { href: "/admin/portal/contributors", n: contributors.length, label: "Contributors", sub: `${contributors.filter((c) => c.profile.public).length} public` },
    { href: "/admin/portal/contributions?review=pending", n: pending, label: "To verify", sub: "self-logged entries" },
    { href: "/admin/portal/contributions", n: total, label: "Contributions", sub: `${unmatched} not yet matched` },
    { href: "/admin/portal/claims", n: claims.length, label: "Active claims", sub: "issues being worked on" },
    { href: "/admin/portal/sync", n: sources.filter((s) => s.active).length, label: "Active sources", sub: `${sources.length} published` },
    { href: "/admin/portal/providers", n: availableProviders().filter((p) => p.id !== "dev").length, label: "Providers live", sub: "for sign-in" },
  ];
  return (
    <>
      <h1 style={{ fontFamily: "var(--cms-font-display)", fontSize: 32 }}>Portal overview</h1>
      <section className="cms-cards" aria-label="Portal">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="cms-card"><span className="cms-card-n">{c.n}</span><span className="cms-card-label">{c.label}</span><span className="cms-card-sub">{c.sub}</span></Link>
        ))}
      </section>
      <section className="cms-panel">
        <h2>Recent sync runs</h2>
        {runs.length ? (
          <ul className="cms-list">
            {runs.map((r) => <li key={r.id}><span className="cms-mono">{r.sourceId}</span> <span className={`pa-chip ${r.status === "ok" ? "ok" : r.status === "error" ? "bad" : "warn"}`}>{r.status}</span> <span className="cms-muted">· {r.startedAt.toLocaleString("en-GB")} · {r.counts.fetched} fetched</span></li>)}
          </ul>
        ) : <p className="cms-muted">No syncs yet.</p>}
      </section>
    </>
  );
}

import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { ContributionItem } from "@/components/portal/ContributionItem";
import { getSettings } from "@/lib/data";
import { HOUSES } from "@/lib/houses";
import { getDashboard } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await requireContributor();
  const { welcome } = await searchParams;
  // The api does the counting and the milestone evaluation; this page only arranges the answer.
  const [dash, settings] = await Promise.all([getDashboard((await sessionToken())!), getSettings()]);
  const visible = dash?.contributions ?? [];
  const accounts = dash?.accounts ?? [];
  const claims = (dash?.claims ?? []).filter((c) => c.status === "active");
  const reached = dash?.milestones.reached ?? [];
  const next = dash?.milestones.next ?? [];
  const byHouse = new Map<string, number>();
  for (const c of visible) byHouse.set(c.house, (byHouse.get(c.house) ?? 0) + 1);
  const open = visible.filter((c) => c.state === "open" && (c.kind === "pr" || c.kind === "merge-request"));

  return (
    <>
      <header className="dash-head">
        <h1>Assalāmu ʿalaykum, {me.displayName.split(" ")[0]}.</h1>
        <p>Your work across the Collective. This page is private to you.</p>
      </header>
      {welcome && (
        <p className="flash ok" role="status">
          Welcome. You’re signed in with {accounts[0] ? accounts[0].username : "your account"}. <Link href="/dashboard/connections">Link your other accounts</Link> so all your work finds you.
        </p>
      )}

      <section className="panel" aria-labelledby="houses-h">
        <h2 id="houses-h">By house</h2>
        <ul className="houses">
          {HOUSES.map((h) => {
            const n = byHouse.get(h.id) ?? 0;
            return (
              <li key={h.id} className={`house-tile${n ? "" : " none"}`}>
                <span className="h-ar" lang="ar" dir="rtl">{h.arabic}</span>
                <span className="h-name">{h.name}</span>
                <span className="h-n">{n ? `${n} contribution${n === 1 ? "" : "s"}` : "Not yet"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="panels">
        <section className="panel" aria-labelledby="recent-h">
          <h2 id="recent-h">Recent contributions <Link href="/dashboard/contributions">All</Link></h2>
          {visible.length ? (
            <ul className="clist">{visible.slice(0, 6).map((c) => <ContributionItem key={c.id} c={c} />)}</ul>
          ) : (
            <p className="empty">Nothing yet. Work in tracked repositories and projects appears here after the next sync, or <Link href="/dashboard/log">log something yourself</Link>.</p>
          )}
        </section>
        <section className="panel" aria-labelledby="ms-h">
          <h2 id="ms-h">Milestones</h2>
          <ul className="milestones">
            {reached.map((r) => (
              <li key={r.id} className="milestone">
                <Khatam variant="site" strokeWidth={6} accent="var(--gold)" />
                <div><strong>{r.title}</strong><span>{r.description}{r.at ? ` · ${fmtDate(r.at)}` : ""}</span></div>
              </li>
            ))}
            {next.slice(0, Math.max(1, 4 - reached.length)).map((d) => (
              <li key={d.id} className="milestone todo">
                <Khatam variant="site" strokeWidth={6} accent="none" />
                <div><strong>{d.title}</strong><span>Ahead: {d.description}</span></div>
              </li>
            ))}
            {!reached.length && !next.length && <li className="empty">No milestones are defined yet.</li>}
          </ul>
        </section>
      </div>

      <div className="panels">
        <section className="panel" aria-labelledby="open-h">
          <h2 id="open-h">Open pull and merge requests</h2>
          {open.length ? <ul className="clist">{open.slice(0, 8).map((c) => <ContributionItem key={c.id} c={c} />)}</ul> : <p className="empty">None open right now.</p>}
        </section>
        <section className="panel" aria-labelledby="claims-h">
          <h2 id="claims-h">Your claimed issues</h2>
          {claims.length ? (
            <ul className="clist">
              {claims.map((c) => (
                <li key={c.id}>
                  <span className="c-title">{c.repo} #{c.issue}</span>
                  <span className={`chip ${c.assigned ? "ok" : "warn"}`}>{c.assigned ? "Assigned" : "Awaiting assignment"}</span>
                  <span className="c-meta">Until {fmtDate(c.expiresAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="empty">You haven’t claimed an issue.</p>}
        </section>
      </div>

      <section className="panel" aria-labelledby="gfi-h">
        <h2 id="gfi-h">Suggested good first issues</h2>
        <p className="empty">{settings.goodFirstIssues}</p>
      </section>
    </>
  );
}

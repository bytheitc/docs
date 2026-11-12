import Link from "next/link";
import { releaseClaim } from "../actions";
import { TopBar } from "@/components/portal/TopBar";
import { getMaintainerClaims } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Claimed issues", robots: { index: false, follow: false } };

/** Triage for the repositories you maintain: who is working on what, and what has gone stale. */
export default async function MaintainerClaims() {
  await requireContributor("/maintainers/claims");
  const data = await getMaintainerClaims((await sessionToken())!);
  const claims = data?.claims ?? [];
  const active = claims.filter((c) => c.status === "active");
  const past = claims.filter((c) => c.status !== "active");
  const who = (id: string) => data?.people[id]?.handle ?? "someone";

  return (
    <>
      <TopBar />
      <main id="main" className="wrap" style={{ paddingBottom: 56, display: "grid", gap: 20 }}>
        <header className="page-head">
          <p className="kicker"><Link href="/maintainers">Maintainers</Link></p>
          <h1>Claimed issues</h1>
          <p>
            Claims on the repositories you maintain. A claim expires on its own if no pull request follows, so
            releasing one by hand is only for when you know it is stale.
          </p>
        </header>

        <section className="panel" aria-labelledby="active-h">
          <h2 id="active-h">Being worked on</h2>
          {active.length ? (
            <ul className="clist">
              {active.map((c) => (
                <li key={c.id}>
                  <span className="c-title">{c.repo} #{c.issue}</span>
                  <span className={`chip ${c.assigned ? "ok" : "warn"}`}>{c.assigned ? "assigned" : "assign by hand"}</span>
                  <span className="c-meta">
                    {who(c.contributorId)} as {c.username} · claimed {fmtDate(c.createdAt)} · until {fmtDate(c.expiresAt)}
                  </span>
                  <form action={releaseClaim} className="row-actions">
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn ghost small">Release</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nothing is claimed on your repositories right now.</p>
          )}
        </section>

        {past.length > 0 && (
          <section className="panel" aria-labelledby="past-h">
            <h2 id="past-h">Expired and released</h2>
            <ul className="clist">
              {past.map((c) => (
                <li key={c.id}>
                  <span className="c-title">{c.repo} #{c.issue}</span>
                  <span className="chip muted">{c.status}</span>
                  <span className="c-meta">{c.username} · {fmtDate(c.createdAt)}{c.releasedBy ? ` · released by ${c.releasedBy}` : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

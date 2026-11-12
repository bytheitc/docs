import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelNomination } from "../../actions";
import { RemoveRightsForm } from "@/components/portal/MaintainerForms";
import { TopBar } from "@/components/portal/TopBar";
import { getMaintainerHome, getRepoGovernance } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { fmtDate } from "@/lib/util";

type Props = { params: Promise<{ owner: string; name: string }> };

export async function generateMetadata({ params }: Props) {
  const { owner, name } = await params;
  return { title: `${owner}/${name}`, robots: { index: false, follow: false } };
}

const days = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));

/** Who maintains a repository, and every nomination it has seen. Governance happens in the open. */
export default async function RepoGovernancePage({ params }: Props) {
  const { owner, name } = await params;
  const repo = `${owner}/${name}`;
  const me = await requireContributor(`/maintainers/${repo}`);
  const token = (await sessionToken())!;
  const [data, home] = await Promise.all([getRepoGovernance(token, repo), getMaintainerHome(token)]);
  if (!data) notFound();

  const who = (id: string) => data.people[id]?.handle ?? "someone";
  const steering = home?.steering ?? false;
  const open = data.nominations.filter((n) => n.status === "open");
  const settled = data.nominations.filter((n) => n.status !== "open");

  return (
    <>
      <TopBar />
      <main id="main" className="wrap" style={{ paddingBottom: 56, display: "grid", gap: 20 }}>
        <header className="page-head">
          <p className="kicker"><Link href="/maintainers">Maintainers</Link></p>
          <h1>{repo}</h1>
          <p>Whoever does the work decides the detail. Cross-repo changes go through RFCs.</p>
        </header>

        <section className="panel" aria-labelledby="who-h">
          <h2 id="who-h">Maintainers</h2>
          {data.maintainers.length ? (
            <ul className="clist">
              {data.maintainers.map((m) => (
                <li key={m.id}>
                  <span className="c-title">
                    <Link href={`/u/${data.people[m.contributorId]?.handle ?? ""}`}>{who(m.contributorId)}</Link>
                  </span>
                  <span className={`chip ${m.role === "maintainer" ? "ok" : "muted"}`}>{m.role}</span>
                  <span className="c-meta">Since {fmtDate(m.since)}{m.by ? ` · brought in by ${who(m.by)}` : " · seated by the Collective"}</span>
                  {/* Only the steering group, and only for conduct. */}
                  {steering && m.contributorId !== me.id && <RemoveRightsForm id={m.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nobody maintains this repository here yet.</p>
          )}
        </section>

        {open.length > 0 && (
          <section className="panel" aria-labelledby="open-h">
            <h2 id="open-h">Open nominations</h2>
            <ul className="clist">
              {open.map((n) => (
                <li key={n.id}>
                  <span className="c-title">{who(n.candidateId)}</span>
                  <span className={`chip ${days(n.closesAt) <= 2 ? "warn" : "muted"}`}>
                    {days(n.closesAt) === 0 ? "carries today" : `${days(n.closesAt)} day(s) left`}
                  </span>
                  <span className="c-meta">
                    Nominated by {who(n.nominatedBy)} on {fmtDate(n.openedAt)} ·{" "}
                    <a href={n.issueUrl} rel="noopener noreferrer" target="_blank">the issue</a>
                  </span>
                  <span className="c-desc">{n.reason}</span>
                  {n.nominatedBy === me.id && (
                    <form action={cancelNomination} className="row-actions">
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="btn ghost small">Withdraw</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {settled.length > 0 && (
          <section className="panel" aria-labelledby="hist-h">
            <h2 id="hist-h">Past nominations</h2>
            <ul className="clist">
              {settled.map((n) => (
                <li key={n.id}>
                  <span className="c-title">{who(n.candidateId)}</span>
                  <span className={`chip ${n.status === "carried" ? "ok" : "muted"}`}>{n.status}</span>
                  <span className="c-meta">
                    By {who(n.nominatedBy)} · {fmtDate(n.openedAt)} ·{" "}
                    <a href={n.issueUrl} rel="noopener noreferrer" target="_blank">the issue</a>
                  </span>
                  {n.objections.map((o) => <span key={o.at} className="c-desc muted">Objection from {who(o.by)}: {o.note}</span>)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.past.length > 0 && (
          <section className="panel" aria-labelledby="emeritus-h">
            <h2 id="emeritus-h">Emeritus and past maintainers</h2>
            <ul className="clist">
              {data.past.map((m) => (
                <li key={m.id}>
                  <span className="c-title">{who(m.contributorId)}</span>
                  <span className="chip muted">{m.endedReason}</span>
                  <span className="c-meta">{fmtDate(m.since)} – {fmtDate(m.endedAt!)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

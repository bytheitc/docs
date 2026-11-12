import Link from "next/link";
import { answerInvitation, stepDown } from "./actions";
import { InviteForm, NominateForm, ObjectForm } from "@/components/portal/MaintainerForms";
import { TopBar } from "@/components/portal/TopBar";
import { getMaintainerHome } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Maintainers", robots: { index: false, follow: false } };

const days = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));

export default async function Maintainers() {
  const me = await requireContributor("/maintainers");
  const home = await getMaintainerHome((await sessionToken())!);

  if (!home) {
    return (
      <>
        <TopBar />
        <main id="main" className="narrow">
          <div className="card"><h1>Maintainers</h1><p className="flash bad" role="alert">The portal service isn&rsquo;t reachable right now.</p></div>
        </main>
      </>
    );
  }

  const who = (id: string) => home.people[id]?.handle ?? "someone";
  const live = home.maintainerships.filter((m) => !m.endedAt);
  const repos = live.filter((m) => m.role === "maintainer").map((m) => m.repo);
  const reviewing = live.filter((m) => m.role === "reviewer");
  const past = home.maintainerships.filter((m) => m.endedAt);

  return (
    <>
      <TopBar />
      <main id="main" className="wrap" style={{ paddingBottom: 56, display: "grid", gap: 20 }}>
        <header className="page-head">
          <p className="kicker">Maintainers</p>
          <h1>Assalāmu ʿalaykum, {me.displayName.split(" ")[0]}.</h1>
          <p>
            There is no application here, and nothing is scored. Maintainers are nominated for work already
            done, and a nomination carries unless a maintainer of that repository objects within seven days.
          </p>
        </header>

        {/* Things waiting on this person come first. */}
        {home.invitations.length > 0 && (
          <section className="panel" aria-labelledby="inv-h">
            <h2 id="inv-h">You&rsquo;ve been invited to review</h2>
            <ul className="clist">
              {home.invitations.map((i) => (
                <li key={i.id}>
                  <span className="c-title">{i.repo}</span>
                  <span className="c-meta">Invited by {who(i.invitedBy)} · {fmtDate(i.createdAt)}</span>
                  {i.note && <span className="c-desc">{i.note}</span>}
                  <span className="row-actions">
                    <form action={answerInvitation}>
                      <input type="hidden" name="id" value={i.id} /><input type="hidden" name="accept" value="true" />
                      <button type="submit" className="btn small">Accept</button>
                    </form>
                    <form action={answerInvitation}>
                      <input type="hidden" name="id" value={i.id} /><input type="hidden" name="accept" value="false" />
                      <button type="submit" className="btn ghost small">Decline</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {home.nominationsToConsider.length > 0 && (
          <section className="panel" aria-labelledby="obj-h">
            <h2 id="obj-h">Nominations on your repositories</h2>
            <p className="muted">
              You don&rsquo;t need to do anything to approve one. Silence carries it. Object only if there is a
              reason, and say it in the issue too.
            </p>
            <ul className="clist">
              {home.nominationsToConsider.map((n) => (
                <li key={n.id}>
                  <span className="c-title">{who(n.candidateId)} for {n.repo}</span>
                  <span className={`chip ${days(n.closesAt) <= 2 ? "warn" : "muted"}`}>
                    {days(n.closesAt) === 0 ? "carries today" : `${days(n.closesAt)} day${days(n.closesAt) === 1 ? "" : "s"} left`}
                  </span>
                  <span className="c-meta">
                    Nominated by {who(n.nominatedBy)} · <a href={n.issueUrl} rel="noopener noreferrer" target="_blank">the issue</a>
                  </span>
                  <span className="c-desc">{n.reason}</span>
                  <ObjectForm id={n.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {home.nominationsAboutMe.length > 0 && (
          <section className="panel" aria-labelledby="me-h">
            <h2 id="me-h">About you</h2>
            <ul className="clist">
              {home.nominationsAboutMe.map((n) => (
                <li key={n.id}>
                  <span className="c-title">{n.repo}</span>
                  <span className={`chip ${n.status === "carried" ? "ok" : n.status === "open" ? "warn" : "muted"}`}>{n.status}</span>
                  <span className="c-meta">
                    Nominated by {who(n.nominatedBy)} · {fmtDate(n.openedAt)}
                    {n.status === "open" ? ` · carries in ${days(n.closesAt)} day(s)` : ""}
                  </span>
                  {n.objections.map((o) => <span key={o.at} className="c-desc muted">Objection from {who(o.by)}: {o.note}</span>)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel" aria-labelledby="hold-h">
          <h2 id="hold-h">What you hold</h2>
          {live.length ? (
            <ul className="clist">
              {live.map((m) => (
                <li key={m.id}>
                  <span className="c-title">
                    {m.repo === "*" ? "The collective" : <Link href={`/maintainers/${m.repo}`}>{m.repo}</Link>}
                  </span>
                  <span className={`chip ${m.role === "steering" ? "ok" : "muted"}`}>{m.role}</span>
                  <span className="c-meta">Since {fmtDate(m.since)}{m.by ? ` · brought in by ${who(m.by)}` : ""}</span>
                  {m.role !== "steering" && (
                    <form action={stepDown} className="row-actions">
                      <input type="hidden" name="repo" value={m.repo} />
                      <button type="submit" className="btn ghost small">Step down</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              Nothing yet. The path starts with an invitation to review from a maintainer of a repository you
              already work on — it isn&rsquo;t something to apply for.
            </p>
          )}
          {reviewing.length > 0 && (
            <p className="muted" style={{ marginTop: 12 }}>
              Reviewing is the step before nomination. Review for a while, and a maintainer may nominate you.
            </p>
          )}
        </section>

        {repos.length > 0 && (
          <>
            <section className="panel" aria-labelledby="nom-h">
              <h2 id="nom-h">Nominate someone</h2>
              <p className="muted">For work already done, in a public issue, in a repository you maintain.</p>
              <NominateForm repos={repos} />
            </section>
            <section className="panel" aria-labelledby="inv2-h">
              <h2 id="inv2-h">Invite a reviewer</h2>
              <p className="muted">The step before a nomination: ask someone to review pull requests for a while.</p>
              <InviteForm repos={repos} />
            </section>
            <p className="muted"><Link href="/maintainers/claims">Issues claimed on your repositories →</Link></p>
          </>
        )}

        {past.length > 0 && (
          <section className="panel" aria-labelledby="past-h">
            <h2 id="past-h">Previously</h2>
            <ul className="clist">
              {past.map((m) => (
                <li key={m.id}>
                  <span className="c-title">{m.repo}</span>
                  <span className="chip muted">{m.endedReason}</span>
                  <span className="c-meta">
                    {fmtDate(m.since)} – {fmtDate(m.endedAt!)}
                    {m.endedReason === "emeritus" ? " · with thanks. Coming back is one message away." : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

import { notFound } from "next/navigation";
import { setContributorDisabled } from "../../actions";
import { ContributionRows } from "../../ui";
import { can, requireUser } from "@/lib/cms/auth";
import { providerName } from "@/lib/providers";
import { requirePortalStore } from "@/lib/portal/store";
import { fmtDate, httpUrl } from "@/lib/portal/util";

export const metadata = { title: "Contributor" };

export default async function ContributorAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("editor");
  const store = requirePortalStore();
  const c = await store.getContributor((await params).id);
  if (!c) notFound();
  const [accounts, contributions, claims] = await Promise.all([
    store.listAccounts(c.id), store.listContributions({ contributorId: c.id, includeHidden: true, limit: 500 }), store.listClaims({ contributorId: c.id }),
  ]);
  const index = new Map([[c.id, { id: c.id, handle: c.handle }]]);
  return (
    <>
      <div className="cms-head-row">
        <div>
          <h1 style={{ fontFamily: "var(--cms-font-display)", fontSize: 30 }}>{c.displayName}</h1>
          <p className="cms-muted"><span className="cms-mono">{c.handle}</span> · joined {fmtDate(c.createdAt)} · {c.profile.public ? "public profile" : "private"}{c.disabled ? " · disabled" : ""}</p>
        </div>
        {can(user, "admin") && (
          <form action={setContributorDisabled}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="disabled" value={String(!c.disabled)} />
            <button type="submit" className={`cms-btn${c.disabled ? "" : " danger"}`}>{c.disabled ? "Re-enable" : "Disable contributor"}</button>
          </form>
        )}
      </div>
      <section className="cms-panel">
        <h2>Linked accounts</h2>
        <ul className="cms-list">
          {accounts.map((a) => {
            const u = a.profileUrl ? httpUrl(a.profileUrl) : null;
            return <li key={`${a.provider}:${a.providerUserId}`}><strong>{providerName(a.provider)}</strong> · {u ? <a href={u} rel="noopener noreferrer">{a.username}</a> : a.username} <span className="cms-muted">· id {a.providerUserId} · linked {fmtDate(a.linkedAt)}</span></li>;
          })}
          {!accounts.length && <li className="cms-muted">None.</li>}
        </ul>
      </section>
      <section className="cms-panel">
        <h2>Claims</h2>
        <ul className="cms-list">
          {claims.map((cl) => <li key={cl.id}>{cl.repo} #{cl.issue} <span className="cms-muted">· {cl.status} · until {fmtDate(cl.expiresAt)}</span></li>)}
          {!claims.length && <li className="cms-muted">None.</li>}
        </ul>
      </section>
      <h2 style={{ fontFamily: "var(--cms-font-display)" }}>Contributions</h2>
      <ContributionRows rows={contributions} canAct={can(user, "publisher")} contributors={index} />
    </>
  );
}

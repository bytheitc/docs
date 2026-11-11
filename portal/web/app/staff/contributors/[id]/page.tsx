import { notFound } from "next/navigation";
import { setContributorDisabled } from "../../actions";
import { ContributionRows, contributorIndex } from "../../ui";
import { staff } from "@/lib/portal";
import { atLeast, requireStaff } from "@/lib/staff-session";
import { fmtDate, httpUrl, providerName } from "@/lib/util";

export const metadata = { title: "Contributor" };

export default async function StaffContributor({ params }: { params: Promise<{ id: string }> }) {
  const { token, user } = await requireStaff("/staff/contributors");
  const result = await staff.contributor(token, (await params).id);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="cms-flash bad" role="alert">{result.message}</p>;
  }
  const { contributor: c, accounts, contributions, claims } = result;
  const index = contributorIndex([{ id: c.id, handle: c.handle }]);

  return (
    <>
      <div className="cms-head-row">
        <div>
          <h1 style={{ fontFamily: "var(--cms-font-display)", fontSize: 30 }}>{c.displayName}</h1>
          <p className="cms-muted"><span className="cms-mono">{c.handle}</span> · joined {fmtDate(c.createdAt)} · {c.profile.public ? "public profile" : "private"}{c.disabled ? " · disabled" : ""}</p>
        </div>
        {atLeast(user, "admin") && (
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
            return (
              <li key={`${a.provider}:${a.providerUserId}`}>
                <strong>{providerName(a.provider)}</strong> · {u ? <a href={u} rel="noopener noreferrer">{a.username}</a> : a.username}{" "}
                <span className="cms-muted">· id {a.providerUserId} · linked {fmtDate(a.linkedAt)}</span>
              </li>
            );
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
      <ContributionRows rows={contributions} canAct={atLeast(user, "publisher")} contributors={index} />
    </>
  );
}

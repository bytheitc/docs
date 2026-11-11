// Shared bits for the portal admin pages (server components).
import Link from "next/link";
import { reviewContribution, setHidden } from "./actions";
import { providerName } from "@/lib/providers";
import type { Contribution } from "@/lib/portal/types";
import { fmtDate, houseName, httpUrl, kindLabel } from "@/lib/portal/util";

export function ReviewChip({ c }: { c: Contribution }) {
  if (c.provider !== "self") return <span className="pa-chip muted">{c.state}</span>;
  const st = c.review?.status ?? "pending";
  return <span className={`pa-chip ${st === "verified" ? "ok" : st === "declined" ? "bad" : "warn"}`}>{st}</span>;
}

export function ContributionRows({ rows, canAct, contributors }: { rows: Contribution[]; canAct: boolean; contributors: Map<string, { handle: string; id: string }> }) {
  return (
    <div className="cms-tablewrap">
      <table className="cms-table">
        <thead>
          <tr><th scope="col">Contribution</th><th scope="col">Contributor</th><th scope="col">Kind · house</th><th scope="col">Date</th><th scope="col">Status</th>{canAct && <th scope="col">Actions</th>}</tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const url = c.url ? httpUrl(c.url) : null;
            const who = c.contributorId ? contributors.get(c.contributorId) : undefined;
            return (
              <tr key={c.id}>
                <td>
                  {url ? <a href={url} rel="noopener noreferrer" target="_blank" className="cms-rowlink">{c.title}</a> : <span className="cms-rowlink">{c.title}</span>}
                  <div className="pa-desc">{c.provider === "self" ? "Self-logged" : providerName(c.provider)}{c.repo ? ` · ${c.repo}` : ""}{c.hidden ? " · hidden" : ""}</div>
                  {c.description && <div className="pa-desc">{c.description}</div>}
                </td>
                <td>{who ? <Link href={`/admin/portal/contributors/${who.id}`}>{who.handle}</Link> : <span className="cms-muted">unmatched{c.authorUsername ? ` (${c.authorUsername})` : ""}</span>}</td>
                <td>{kindLabel(c.kind)} · {houseName(c.house)}</td>
                <td className="cms-muted">{fmtDate(c.occurredAt)}</td>
                <td><ReviewChip c={c} /></td>
                {canAct && (
                  <td>
                    <div className="pa-inline">
                      {c.provider === "self" && c.review?.status !== "verified" && (
                        <form action={reviewContribution}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="decision" value="verified" /><button className="cms-btn primary" type="submit">Verify</button></form>
                      )}
                      {c.provider === "self" && c.review?.status !== "declined" && (
                        <form action={reviewContribution} className="pa-inline">
                          <input type="hidden" name="id" value={c.id} /><input type="hidden" name="decision" value="declined" />
                          <label className="cms-sr" htmlFor={`note-${c.id}`}>Note to contributor</label>
                          <input id={`note-${c.id}`} name="note" type="text" placeholder="Note (optional)" maxLength={500} />
                          <button className="cms-btn" type="submit">Decline</button>
                        </form>
                      )}
                      <form action={setHidden}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="hidden" value={String(!c.hidden)} /><button className="cms-btn" type="submit">{c.hidden ? "Unhide" : "Hide"}</button></form>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={canAct ? 6 : 5} className="cms-muted">Nothing here.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export async function contributorIndex(store: { listContributors(): Promise<{ id: string; handle: string }[]> }) {
  return new Map((await store.listContributors()).map((c) => [c.id, { id: c.id, handle: c.handle }]));
}

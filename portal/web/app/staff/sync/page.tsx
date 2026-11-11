import { runSync } from "../actions";
import { staff } from "@/lib/portal";
import { atLeast, requireStaff } from "@/lib/staff-session";
import { cmsSpaceUrl, houseName, providerName } from "@/lib/util";

export const metadata = { title: "Sync" };

const tone = (s: string) => (s === "ok" ? "ok" : s === "error" ? "bad" : "warn");
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB") : "");

export default async function StaffSync() {
  const { token, user } = await requireStaff("/staff/sync");
  const result = await staff.sync(token);
  if (!result.ok) return <p className="cms-flash bad" role="alert">{result.message}</p>;

  const { sources, runs, syncable } = result;
  const lastBy = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!lastBy.has(r.sourceId)) lastBy.set(r.sourceId, r);
  const canRun = atLeast(user, "publisher");

  return (
    <>
      <div className="cms-head-row">
        <p className="cms-muted">
          Sources are edited in the Studio under <a href={cmsSpaceUrl("c/sources")}>Tracked sources</a>. Only published,
          active sources sync. Credentials come from the api&rsquo;s own environment, never from contributors.
        </p>
        {canRun && <form action={runSync}><input type="hidden" name="source" value="__all" /><button className="cms-btn primary" type="submit">Sync all active sources</button></form>}
      </div>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">Source</th><th scope="col">Provider</th><th scope="col">House</th><th scope="col">Last run</th>{canRun && <th scope="col"><span className="cms-sr">Actions</span></th>}</tr></thead>
          <tbody>
            {sources.map((s) => {
              const last = lastBy.get(s.id);
              return (
                <tr key={s.id}>
                  <td>
                    <a className="cms-rowlink" href={cmsSpaceUrl(`c/sources/${s.id}`)}>{s.label}</a>
                    <div className="pa-desc">{s.active ? "" : "inactive"}</div>
                  </td>
                  <td>{providerName(s.provider)}</td>
                  <td>{houseName(s.house)}</td>
                  <td>{last ? <><span className={`pa-chip ${tone(last.status)}`}>{last.status}</span> <span className="cms-muted">{when(last.startedAt)}</span></> : <span className="cms-muted">never</span>}</td>
                  {canRun && <td>{syncable.includes(s.provider) ? <form action={runSync}><input type="hidden" name="source" value={s.id} /><button className="cms-btn" type="submit">Sync now</button></form> : <span className="cms-muted">no sync</span>}</td>}
                </tr>
              );
            })}
            {!sources.length && <tr><td colSpan={canRun ? 5 : 4} className="cms-muted">No published sources.</td></tr>}
          </tbody>
        </table>
      </div>
      <section className="cms-panel">
        <h2>Run log</h2>
        <div className="cms-tablewrap">
          <table className="cms-table">
            <thead><tr><th scope="col">Source</th><th scope="col">Started</th><th scope="col">Finished</th><th scope="col">Counts</th><th scope="col">Status</th><th scope="col">By</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="cms-mono">{r.sourceId}</td>
                  <td className="cms-muted">{when(r.startedAt)}</td>
                  <td className="cms-muted">{r.finishedAt ? new Date(r.finishedAt).toLocaleTimeString("en-GB") : "running"}</td>
                  <td>{r.counts.fetched} fetched · {r.counts.created} new · {r.counts.updated} updated · {r.counts.matched} matched</td>
                  <td><span className={`pa-chip ${tone(r.status)}`}>{r.status}</span>{r.errors.length > 0 && <div className="pa-desc">{r.errors.join("; ")}</div>}</td>
                  <td className="cms-muted">{r.by ?? "system"}</td>
                </tr>
              ))}
              {!runs.length && <tr><td colSpan={6} className="cms-muted">No runs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

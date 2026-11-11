import Link from "next/link";
import { runSync } from "../actions";
import { can, requireUser } from "@/lib/cms/auth";
import { getSources } from "@/lib/data";
import { knownProvider, providerName } from "@/lib/providers";
import { requirePortalStore } from "@/lib/portal/store";
import { houseName } from "@/lib/portal/util";

export const metadata = { title: "Sync" };

export default async function SyncAdmin() {
  const user = await requireUser("editor");
  const store = requirePortalStore();
  const [sources, runs] = await Promise.all([getSources(), store.listSyncRuns({ limit: 50 })]);
  const lastBy = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!lastBy.has(r.sourceId)) lastBy.set(r.sourceId, r);
  const canRun = can(user, "publisher");
  const tone = (s: string) => (s === "ok" ? "ok" : s === "error" ? "bad" : "warn");
  return (
    <>
      <div className="cms-head-row">
        <p className="cms-muted">Sources are edited under <Link href="/admin/c/sources">Tracked sources</Link>. Only published, active sources sync. Credentials come from the server’s environment, never from contributors.</p>
        {canRun && <form action={runSync}><input type="hidden" name="source" value="__all" /><button className="cms-btn primary" type="submit">Sync all active sources</button></form>}
      </div>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">Source</th><th scope="col">Provider</th><th scope="col">House</th><th scope="col">Last run</th>{canRun && <th scope="col"><span className="cms-sr">Actions</span></th>}</tr></thead>
          <tbody>
            {sources.map((s) => {
              const last = lastBy.get(s.id);
              const syncable = !!knownProvider(s.provider)?.sync;
              return (
                <tr key={s.id}>
                  <td><Link className="cms-rowlink" href={`/admin/c/sources/${s.id}`}>{s.label}</Link><div className="pa-desc">{[s.owner, s.repo, s.page].filter(Boolean).join(" / ") || "linked accounts"}{s.active ? "" : " · inactive"}</div></td>
                  <td>{providerName(s.provider)}</td>
                  <td>{houseName(s.house)}</td>
                  <td>{last ? <><span className={`pa-chip ${tone(last.status)}`}>{last.status}</span> <span className="cms-muted">{last.startedAt.toLocaleString("en-GB")}</span></> : <span className="cms-muted">never</span>}</td>
                  {canRun && <td>{syncable ? <form action={runSync}><input type="hidden" name="source" value={s.id} /><button className="cms-btn" type="submit">Sync now</button></form> : <span className="cms-muted">no sync</span>}</td>}
                </tr>
              );
            })}
            {!sources.length && <tr><td colSpan={5} className="cms-muted">No published sources.</td></tr>}
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
                  <td className="cms-muted">{r.startedAt.toLocaleString("en-GB")}</td>
                  <td className="cms-muted">{r.finishedAt ? r.finishedAt.toLocaleTimeString("en-GB") : "running"}</td>
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

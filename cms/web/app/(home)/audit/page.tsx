import { authed, requireUser } from "@/lib/session";
import { fmt, type AuditEvent, type SpaceSummary } from "@/lib/types";

export const metadata = { title: "Audit log" };

type Props = { searchParams: Promise<{ space?: string }> };

export default async function AuditPage({ searchParams }: Props) {
  await requireUser("admin");
  const { space } = await searchParams;
  const [{ events }, { spaces }] = await Promise.all([
    authed<{ events: AuditEvent[] }>(`/v1/audit?limit=300${space ? `&space=${encodeURIComponent(space)}` : ""}`),
    authed<{ spaces: SpaceSummary[] }>("/v1/spaces"),
  ]);
  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Accountability</p>
        <h1>Audit log</h1>
        <p className="cms-muted">Every sign-in, edit, publication, webhook and permission change. The latest 300 events.</p>
      </header>
      <form className="cms-filters">
        <label className="cms-sr" htmlFor="sp">Space</label>
        <select id="sp" name="space" defaultValue={space ?? ""}>
          <option value="">All spaces and accounts</option>
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button type="submit" className="cms-btn">Filter</button>
      </form>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">When</th><th scope="col">Space</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Target</th><th scope="col">Detail</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td className="cms-muted">{fmt(e.at)}</td>
                <td>{e.space ?? "·"}</td>
                <td>{e.actor ?? "anonymous"}</td>
                <td className="cms-mono">{e.action}</td>
                <td className="cms-mono">{e.target ?? ""}</td>
                <td className="cms-wrap">{e.detail ?? ""}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={6} className="cms-muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

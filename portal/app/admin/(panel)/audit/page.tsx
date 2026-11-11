import { requireUser } from "@/lib/cms/auth";
import { requireStorage } from "@/lib/cms/storage";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireUser("admin");
  const events = await requireStorage().listAudit(300);
  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Accountability</p>
        <h1>Audit log</h1>
        <p className="cms-muted">Every sign-in, edit, publication and permission change. The latest 300 events.</p>
      </header>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Target</th><th scope="col">Detail</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td className="cms-muted">{e.at.toLocaleString("en-GB")}</td>
                <td>{e.actor ?? "anonymous"}</td>
                <td className="cms-mono">{e.action}</td>
                <td className="cms-mono">{e.target ?? ""}</td>
                <td>{e.detail ?? ""}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={5} className="cms-muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

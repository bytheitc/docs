import { staff } from "@/lib/portal";
import { requireStaff } from "@/lib/staff-session";

export const metadata = { title: "Providers" };

/**
 * What an administrator needs to finish connecting a platform. portal/api reports each setting as
 * present or missing and never sends its value, so nothing here can leak a client secret.
 */
export default async function StaffProviders() {
  const { token } = await requireStaff("/staff/providers");
  const result = await staff.providers(token);
  if (!result.ok) return <p className="cms-flash bad" role="alert">{result.message}</p>;

  const r = result;

  return (
    <>
      <p className="cms-muted">
        A provider appears for sign-in once portal/api has its settings (restart the api after changing them).
        Callback URLs use <code style={{ overflowWrap: "anywhere" }}>{r.callbackBase}</code>. Development sign-in is{" "}
        {r.devEnabled ? "on (development server)" : "off (production)"}.
      </p>
      {r.providers.map((p) => (
        <section key={p.id} className="cms-panel">
          <h2>{p.name} {p.configured ? <span className="pa-chip ok">sign-in configured</span> : <span className="pa-chip muted">not configured</span>}</h2>
          <p className="cms-muted" style={{ marginBottom: 10 }}>{p.blurb} · {p.category}</p>
          <p className="pa-env" style={{ fontSize: 14, marginBottom: 6 }}>
            <strong>Sign-in:</strong> {p.signInSettings.map((v) => <code key={v.name}>{v.name} {v.set ? "✓" : "✗"}</code>)}
          </p>
          {p.syncSettings.length > 0 && (
            <p className="pa-env" style={{ fontSize: 14, marginBottom: 10 }}>
              <strong>Sync (optional):</strong> {p.syncSettings.map((v) => <code key={v.name}>{v.name} {v.set ? "✓" : "–"}</code>)}
            </p>
          )}
          <ol className="pa-steps">{p.setup.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="cms-help">Status: {p.tested}</p>
        </section>
      ))}
    </>
  );
}

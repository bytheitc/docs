import { requireUser } from "@/lib/cms/auth";
import { DEV_PROVIDER_ENABLED, isConfigured, PROVIDERS } from "@/lib/providers";
import { origin } from "@/lib/portal/util";

export const metadata = { title: "Providers" };

export default async function ProvidersAdmin() {
  await requireUser("editor");
  const base = origin();
  const env = process.env as Record<string, string | undefined>;
  return (
    <>
      <p className="cms-muted">
        A provider appears for sign-in once its env vars are set (restart the server after changing them). Callback URLs use{" "}
        <code style={{ overflowWrap: "anywhere" }}>{base}</code>{process.env.PORTAL_URL ? "" : " (set PORTAL_URL in production)"}. Development sign-in is {DEV_PROVIDER_ENABLED ? "on (development server)" : "off (production build)"}.
      </p>
      {PROVIDERS.map((p) => (
        <section key={p.id} className="cms-panel">
          <h2>{p.name} {isConfigured(p) ? <span className="pa-chip ok">sign-in configured</span> : <span className="pa-chip muted">not configured</span>}</h2>
          <p className="cms-muted" style={{ marginBottom: 10 }}>{p.blurb} · {p.category}</p>
          <p className="pa-env" style={{ fontSize: 14, marginBottom: 6 }}>
            <strong>Sign-in:</strong> {p.envVars.map((v) => <code key={v}>{v} {env[v] ? "✓" : "✗"}</code>)}
          </p>
          {p.syncEnvVars?.length ? (
            <p className="pa-env" style={{ fontSize: 14, marginBottom: 10 }}><strong>Sync (optional):</strong> {p.syncEnvVars.map((v) => <code key={v}>{v} {env[v] ? "✓" : "–"}</code>)}</p>
          ) : null}
          <ol className="pa-steps">{p.setup.map((s) => <li key={s}>{s.replace("{callback}", `${base}/auth/${p.id}/callback`)}</li>)}</ol>
          <p className="cms-help">Status: {p.tested}</p>
        </section>
      ))}
    </>
  );
}

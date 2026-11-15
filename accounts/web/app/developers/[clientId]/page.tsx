import { notFound } from "next/navigation";
import { AccountNav } from "@/components/AccountNav";
import { CollectiveBar } from "@/components/CollectiveBar";
import { DeleteAppButton } from "@/components/DeleteAppButton";
import { EditAppForm } from "@/components/EditAppForm";
import { RegenerateSecretButton } from "@/components/RegenerateSecretButton";
import { TopBar } from "@/components/TopBar";
import { getApp } from "@/lib/accounts";
import { requireAccount, sessionToken } from "@/lib/session";

export const metadata = { title: "Your app" };

const API_URL = (process.env.API_URL ?? "http://localhost:4009").replace(/\/+$/, "");
const STATUS_CHIP: Record<string, string> = { approved: "ok", pending: "warn", rejected: "bad" };

export default async function AppDetail({ params }: { params: Promise<{ clientId: string }> }) {
  await requireAccount("/developers");
  const { clientId } = await params;
  const token = (await sessionToken())!;
  const app = (await getApp(token, clientId))?.app;
  if (!app) notFound();

  const redirectUri = app.redirectUris[0] ?? "https://example.org/callback";
  const scopeStr = app.allowedScopes.length ? app.allowedScopes.join(" ") : app.requestedScopes.join(" ");
  const authorizeUrl = `${API_URL}/oauth/authorize?client_id=${app.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopeStr)}&code_challenge=<challenge>&code_challenge_method=S256`;

  return (
    <>
      <TopBar current="account" />
      <main id="main" className="dash">
        <AccountNav />
        <div className="dash-main">
          <header className="dash-head">
            <h1>{app.name} <span className={`chip ${STATUS_CHIP[app.status]}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>{app.status}</span></h1>
            <p>Client ID: <code>{app.clientId}</code></p>
          </header>

          {app.status === "pending" && <p className="flash info" role="status">Waiting on a staff reviewer because it asks for: {app.requestedScopes.filter((s) => s !== "openid").join(", ") || "a confidential client"}.</p>}
          {app.status === "rejected" && <p className="flash bad" role="alert">Rejected{app.rejectionReason ? `: ${app.rejectionReason}` : "."} Edit and it stays rejected — delete and register again to ask for review once more.</p>}

          <section className="panel" aria-labelledby="edit-h">
            <h2 id="edit-h">Settings</h2>
            <EditAppForm app={app} />
          </section>

          {app.type === "confidential" && (
            <section className="panel" aria-labelledby="secret-h">
              <h2 id="secret-h">Client secret</h2>
              <p className="muted">Only the hash is kept here — if you’ve lost the secret, regenerate it.</p>
              <div style={{ marginTop: 10 }}><RegenerateSecretButton clientId={app.clientId} /></div>
            </section>
          )}

          <section className="panel" aria-labelledby="quickstart-h">
            <h2 id="quickstart-h">Quickstart</h2>
            <p className="muted">Authorization code + PKCE, every time — see the full guide at <a href="/docs">/docs</a>.</p>
            <p className="label" style={{ marginTop: 12 }}>Discovery</p>
            <pre className="panel" style={{ fontSize: 13, overflowX: "auto" }}>{`GET ${API_URL}/oauth/.well-known/openid-configuration`}</pre>
            <p className="label" style={{ marginTop: 12 }}>Send someone here to sign in</p>
            <pre className="panel" style={{ fontSize: 13, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{authorizeUrl}</pre>
            <p className="label" style={{ marginTop: 12 }}>Exchange the code it redirects back with</p>
            <pre className="panel" style={{ fontSize: 13, overflowX: "auto" }}>{`curl -X POST ${API_URL}/oauth/token \\
  -H "content-type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "client_id": "${app.clientId}",${app.type === "confidential" ? '\n    "client_secret": "<your secret>",' : ""}
    "code": "<code from the redirect>",
    "redirect_uri": "${redirectUri}",
    "code_verifier": "<the verifier for the challenge above>"
  }'`}</pre>
          </section>

          <section className="panel danger-zone" aria-labelledby="danger-h">
            <h2 id="danger-h">Delete this app</h2>
            <p className="muted">Immediate. Anyone signed into it stays signed in until their access token expires (at most an hour), then it stops working.</p>
            <div style={{ marginTop: 10 }}><DeleteAppButton clientId={app.clientId} name={app.name} /></div>
          </section>
        </div>
      </main>
      <CollectiveBar current="accounts" title="Islamic Tech Collective · ITC Account" />
    </>
  );
}

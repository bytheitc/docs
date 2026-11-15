import Link from "next/link";
import { CollectiveBar } from "@/components/CollectiveBar";
import { TopBar } from "@/components/TopBar";

export const metadata = { title: "Integration docs" };

const API_URL = (process.env.API_URL ?? "http://localhost:4009").replace(/\/+$/, "");
const ISSUER = `${API_URL}/oauth`;

const SCOPES = [
  { id: "openid", claims: "sub", note: "Always included — confirms who signed in. No review." },
  { id: "profile", claims: "preferred_username, name, picture", note: "No review." },
  { id: "contributions", claims: "itc_contributions, itc_houses", note: "Reviewed." },
  { id: "entitlements", claims: "itc_tier, itc_entitlements", note: "Reviewed." },
  { id: "offline_access", claims: "issues a refresh_token", note: "Reviewed." },
];

export default function Docs() {
  return (
    <>
      <TopBar />
      <main id="main" className="narrow" style={{ maxWidth: 760 }}>
        <div className="card">
          <h1>Integrating "Sign in with ITC"</h1>
          <p className="muted">
            Authorization code + PKCE, always — there's no implicit flow and no password grant.
            Register an app at <Link href="/developers">/developers</Link> first; everything below
            assumes you have a <code>client_id</code>.
          </p>

          <h2 style={{ marginTop: 28, fontSize: 22 }}>The SDK</h2>
          <p>
            <code>itc-accounts-sdk</code> (in the collective's repo, at <code>accounts/sdk</code>)
            wraps everything below — PKCE generation, the authorize URL, the token exchange, and
            id_token verification against the published JWKS. It's dependency-free, built only on
            <code> fetch</code> and the Web Crypto API, so it runs unmodified in a browser or in
            Node. Its own README has a complete walkthrough; this page is the protocol underneath
            it, for anyone calling the endpoints directly or in another language.
          </p>

          <h2 id="discovery" style={{ marginTop: 28, fontSize: 22 }}>1. Discovery</h2>
          <p>Everything else on this page is derived from here — don't hard-code the other endpoint URLs.</p>
          <pre className="panel" style={{ fontSize: 13, overflowX: "auto" }}>{`GET ${ISSUER}/.well-known/openid-configuration`}</pre>

          <h2 id="pkce" style={{ marginTop: 28, fontSize: 22 }}>2. PKCE</h2>
          <p>
            Generate a random <code>code_verifier</code> (43–128 unreserved characters), and send its
            S256 hash as <code>code_challenge</code>. <code>plain</code> is not accepted — anyone
            who can steal the code can read the verifier off the same request, so it protects
            nothing.
          </p>
          <pre className="panel" style={{ fontSize: 13, overflowX: "auto" }}>{`// web crypto, the same way the SDK does it — no library needed
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));`}</pre>

          <h2 id="authorize" style={{ marginTop: 28, fontSize: 22 }}>3. Send them to sign in</h2>
          <pre className="panel" style={{ fontSize: 13, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{`GET ${ISSUER}/authorize
  ?client_id=<your client_id>
  &redirect_uri=<exactly one you registered>
  &response_type=code
  &scope=openid+profile
  &state=<random, check it comes back>
  &code_challenge=<from step 2>
  &code_challenge_method=S256`}</pre>
          <p className="help">Redirect URIs match exactly — no prefixes, no wildcards. Register every one you'll use, including each local-dev port.</p>

          <h2 id="token" style={{ marginTop: 28, fontSize: 22 }}>4. Exchange the code</h2>
          <p>Your redirect URI receives <code>?code=...&amp;state=...</code>. Trade it for tokens server-side:</p>
          <pre className="panel" style={{ fontSize: 13, overflowX: "auto" }}>{`curl -X POST ${ISSUER}/token \\
  -H "content-type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "client_id": "<your client_id>",
    "client_secret": "<only for a confidential client>",
    "code": "<from the redirect>",
    "redirect_uri": "<the exact one you sent above>",
    "code_verifier": "<from step 2>"
  }'`}</pre>
          <p>Answers with <code>access_token</code>, <code>id_token</code>, and — only if you asked for <code>offline_access</code> — a <code>refresh_token</code>.</p>

          <h2 id="verify" style={{ marginTop: 28, fontSize: 22 }}>5. Verify the id_token</h2>
          <p>
            It's an RS256 JWT. Fetch <code>jwks_uri</code> from discovery, find the key matching the
            token's <code>kid</code>, and check the signature, <code>iss</code>, <code>aud</code> and
            <code> exp</code> — don't just parse the JSON and trust it.
          </p>

          <h2 id="userinfo" style={{ marginTop: 28, fontSize: 22 }}>6. Or ask userinfo</h2>
          <pre className="panel" style={{ fontSize: 13, overflowX: "auto" }}>{`curl ${ISSUER}/userinfo -H "authorization: Bearer <access_token>"`}</pre>

          <h2 id="scopes" style={{ marginTop: 28, fontSize: 22 }}>Scopes</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line-strong)" }}>
                <th style={{ padding: "6px 8px" }}>Scope</th>
                <th style={{ padding: "6px 8px" }}>Releases</th>
                <th style={{ padding: "6px 8px" }}>Registration</th>
              </tr>
            </thead>
            <tbody>
              {SCOPES.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "6px 8px" }}><code>{s.id}</code></td>
                  <td style={{ padding: "6px 8px" }}><code>{s.claims}</code></td>
                  <td style={{ padding: "6px 8px" }}>{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="help" style={{ marginTop: 10 }}>
            "Reviewed" means your app goes live the moment you register it if it only asks for
            <code> openid</code>/<code>profile</code>; asking for anything else, or registering a
            confidential client, holds it for a quick staff review before anyone can sign in
            through it. You'll see the status on your app's page at <Link href="/developers">/developers</Link>.
          </p>

          <h2 style={{ marginTop: 28, fontSize: 22 }}>Other endpoints</h2>
          <ul>
            <li><code>POST {ISSUER}/introspect</code> — for a resource server of your own: is this access token still live? Requires your client credentials.</li>
            <li><code>POST {ISSUER}/revoke</code> — hand a token back before it expires.</li>
            <li><code>POST {ISSUER}/token</code> with <code>grant_type=refresh_token</code> — a new access token, if you have <code>offline_access</code>.</li>
          </ul>

          <h2 style={{ marginTop: 28, fontSize: 22 }}>Security notes</h2>
          <ul>
            <li>Access and refresh tokens are opaque — treat them as secrets, never decode or inspect them; they carry no information of their own.</li>
            <li>A token presented twice (a replayed code, a reused refresh token) revokes every token issued from it, not just the replay — expect a session to disappear entirely if that happens, and treat it as a sign something leaked.</li>
            <li>Access tokens last an hour. Introspection, not local expiry, is what makes revocation immediate — use it if you're holding a token for longer than a single request.</li>
          </ul>
        </div>
      </main>
      <CollectiveBar current="accounts" />
    </>
  );
}

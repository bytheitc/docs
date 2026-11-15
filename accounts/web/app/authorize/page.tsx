// "Sign in with ITC": the consent screen. Renders what GET /oauth/authorize (accounts/api)
// describes, and nothing else — the api validates the client and redirect_uri before anything
// here runs, so an error below is always safe to show rather than redirect.
import { redirect } from "next/navigation";
import { approveConsent } from "@/app/authorize/actions";
import { CollectiveBar } from "@/components/CollectiveBar";
import { TopBar } from "@/components/TopBar";
import { approveAuthorize, describeAuthorize } from "@/lib/accounts";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Sign in with ITC" };

type Query = Record<string, string | undefined>;

const WIRE_FIELDS = ["client_id", "redirect_uri", "response_type", "scope", "state", "nonce", "code_challenge", "code_challenge_method"] as const;

function toQueryString(sp: Query): string {
  const q = new URLSearchParams();
  for (const k of WIRE_FIELDS) if (sp[k]) q.set(k, sp[k]!);
  return q.toString();
}

export default async function Authorize({ searchParams }: { searchParams: Promise<Query> }) {
  const sp = await searchParams;
  const query = toQueryString(sp);
  const token = await sessionToken();

  const result = await describeAuthorize(query, token);
  if (!result.ok) {
    return (
      <>
        <TopBar />
        <main id="main" className="narrow">
          <div className="card">
            <h1>This sign-in link isn’t valid</h1>
            <p className="flash bad" role="alert">{result.message}</p>
            <p className="muted" style={{ marginTop: 12 }}>
              Nothing was shared. If you got here from a link in an app, let whoever built it know.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!result.signedIn) redirect(`/sign-in?next=${encodeURIComponent(`/authorize?${query}`)}`);

  if (!result.needsConsent) {
    const approved = await approveAuthorize(
      {
        client_id: sp.client_id!, redirect_uri: sp.redirect_uri!, response_type: sp.response_type ?? "code",
        scope: sp.scope ?? "openid", state: sp.state, nonce: sp.nonce,
        code_challenge: sp.code_challenge ?? "", code_challenge_method: sp.code_challenge_method ?? "S256",
      },
      token!,
    );
    if (approved.ok) redirect(approved.redirectTo);
    // Fell through: something went wrong issuing the code even though consent wasn't required
    // (most likely the rate limit). Render the ordinary consent card below instead of a dead end.
  }

  const denyUrl = (() => {
    const to = new URL(sp.redirect_uri!);
    to.searchParams.set("error", "access_denied");
    if (sp.state) to.searchParams.set("state", sp.state);
    return to.toString();
  })();

  return (
    <>
      <TopBar />
      <main id="main" className="narrow">
        <div className="card">
          <h1>Sign in with ITC</h1>
          <p className="muted">
            <strong>{result.client.name}</strong> wants to use your ITC account to sign you in.
            {result.client.homepage && (
              <> · <a href={result.client.homepage} rel="noopener noreferrer">About this app</a></>
            )}
          </p>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>This will let it:</h2>
            <ul className="taglist" style={{ display: "grid", gap: 8, listStyle: "none" }}>
              {result.scopes.map((s) => <li key={s.id}>{s.description}</li>)}
            </ul>
          </div>

          <form action={approveConsent} style={{ marginTop: 20 }}>
            {WIRE_FIELDS.map((k) => sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null)}
            <div className="hero-actions">
              <button type="submit" className="btn">Allow</button>
              <a href={denyUrl} className="btn ghost">Cancel</a>
            </div>
          </form>

          <p className="help" style={{ marginTop: 16 }}>
            You can take this back at any time from <a href="/account">your account</a>.
          </p>
        </div>
      </main>
      <CollectiveBar current="accounts" />
    </>
  );
}

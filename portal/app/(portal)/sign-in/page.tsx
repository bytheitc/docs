import { redirect } from "next/navigation";
import { TopBar } from "@/components/portal/TopBar";
import { availableProviders, DEV_PROVIDER_ENABLED } from "@/lib/providers";
import { safeNext } from "@/lib/portal/accounts";
import { currentContributor } from "@/lib/portal/session";
import { getPortalStore } from "@/lib/portal/store";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  provider: "That platform isn’t available for sign-in here.",
  "no-database": "Sign-in isn’t available yet: this server has no database connected.",
  state: "The sign-in link expired or didn’t match. Please try again.",
  denied: "Sign-in was cancelled on the platform.",
  exchange: "We couldn’t confirm your identity with the platform. Please try again.",
  disabled: "This account has been disabled. Contact the Collective if you think this is a mistake.",
  rate: "Too many attempts. Please wait a minute and try again.",
  taken: "That account is already linked to another contributor.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; signedout?: string }> }) {
  const { error, next, signedout } = await searchParams;
  const dest = safeNext(next);
  if (await currentContributor()) redirect(dest);
  const providers = availableProviders().filter((p) => p.id !== "dev");
  const hasDb = !!getPortalStore();
  const q = dest !== "/dashboard" ? `?next=${encodeURIComponent(dest)}` : "";

  return (
    <>
      <TopBar current="sign-in" />
      <main id="main" className="narrow">
        <div className="card">
          <h1>Sign in</h1>
          <p className="muted">Choose a platform you contribute on. We ask it who you are, and nothing more. You can link the others afterwards.</p>
          {error && ERRORS[error] && <p className="flash bad" role="alert" style={{ marginTop: 16 }}>{ERRORS[error]}</p>}
          {signedout && <p className="flash ok" role="status" style={{ marginTop: 16 }}>You’ve been signed out on every device.</p>}
          {!hasDb && <p className="flash info" style={{ marginTop: 16 }}>No database is connected, so sign-in is switched off on this server.</p>}
          {providers.length ? (
            <div className="provider-buttons">
              {providers.map((p) => (
                <a key={p.id} className="btn ghost" href={`/auth/${p.id}/start${q}`}>
                  <span>Continue with {p.name}</span><span className="cat">{p.category}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="flash info" style={{ marginTop: 16 }}>No providers configured. An administrator needs to set up at least one platform (see <code>.env.example</code>).</p>
          )}
          {DEV_PROVIDER_ENABLED && (
            <form action="/auth/dev/start" method="get" className="dev-form">
              <p className="label">Development sign-in</p>
              <p className="help">Only exists outside production. Signs in a fake account without OAuth.</p>
              <label className="sr-only" htmlFor="dev-user">Development username</label>
              <input id="dev-user" name="user" type="text" defaultValue="dev-contributor" pattern="[a-z0-9][a-z0-9-]{1,30}" />
              {dest !== "/dashboard" && <input type="hidden" name="next" value={dest} />}
              <button type="submit" className="btn">Sign in with a development account</button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

import { redirect } from "next/navigation";
import { PasskeySignInButton } from "@/components/PasskeySignInButton";
import { PasswordSignInForm } from "@/components/PasswordSignInForm";
import { TopBar } from "@/components/TopBar";
import { getProviders } from "@/lib/accounts";
import { currentAccount } from "@/lib/session";
import { safeNext } from "@/lib/util";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  provider: "That platform isn’t available for sign-in here.",
  unavailable: "Sign-in isn’t available yet: the accounts service isn’t reachable.",
  state: "The sign-in link expired or didn’t match. Please try again.",
  denied: "Sign-in was cancelled on the platform.",
  exchange: "We couldn’t confirm your identity with the platform. Please try again.",
  disabled: "This account has been disabled. Contact the Collective if you think this is a mistake.",
  rate: "Too many attempts. Please wait a minute and try again.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; signedout?: string }> }) {
  const { error, next, signedout } = await searchParams;
  const dest = safeNext(next);
  if (await currentAccount()) redirect(dest);
  const { usable, devEnabled, reachable } = await getProviders();
  const providers = usable.filter((p) => p.id !== "dev");
  const q = dest !== "/account" ? `?next=${encodeURIComponent(dest)}` : "";

  return (
    <>
      <TopBar current="sign-in" />
      <main id="main" className="narrow">
        <div className="card">
          <h1>Sign in</h1>
          <p className="muted">
            Your ITC account is the same identity you use in the contributor portal. Choose a platform
            you contribute on — we ask it who you are, and nothing more.
          </p>
          {error && ERRORS[error] && <p className="flash bad" role="alert" style={{ marginTop: 16 }}>{ERRORS[error]}</p>}
          {signedout && <p className="flash ok" role="status" style={{ marginTop: 16 }}>You’ve been signed out on every device.</p>}
          {!reachable && <p className="flash info" style={{ marginTop: 16 }}>The accounts service isn’t reachable, so sign-in is switched off right now.</p>}

          <div style={{ marginTop: 16 }}><PasskeySignInButton next={dest} /></div>
          <details style={{ marginTop: 10 }}>
            <summary className="help" style={{ cursor: "pointer" }}>Sign in with a password instead</summary>
            <div style={{ marginTop: 10 }}><PasswordSignInForm next={dest} /></div>
          </details>
          <p className="help" style={{ marginTop: 16, marginBottom: -4 }}>Haven’t set those up? Use the platform you contribute on:</p>

          {providers.length ? (
            <div className="provider-buttons">
              {providers.map((p) => (
                <a key={p.id} className="btn ghost" href={`/login/${p.id}/start${q}`}>
                  <span>Continue with {p.name}</span><span className="cat">{p.category}</span>
                </a>
              ))}
            </div>
          ) : (
            reachable && (
              <p className="flash info" style={{ marginTop: 16 }}>No platforms are configured on the portal yet.</p>
            )
          )}
          {devEnabled && (
            <form action="/login/dev/start" method="get" className="dev-form">
              <p className="label">Development sign-in</p>
              <p className="help">Only exists outside production. Signs in a fake account without OAuth.</p>
              <label className="sr-only" htmlFor="dev-user">Development username</label>
              <input id="dev-user" name="user" type="text" defaultValue="dev-contributor" pattern="[a-z0-9][a-z0-9-]{1,30}" />
              {dest !== "/account" && <input type="hidden" name="next" value={dest} />}
              <button type="submit" className="btn">Sign in with a development account</button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

import { disconnectApp, signOut, signOutEverywhere } from "@/app/actions";
import { AccountNav } from "@/components/AccountNav";
import { Avatar } from "@/components/Avatar";
import { CollectiveBar } from "@/components/CollectiveBar";
import { TopBar } from "@/components/TopBar";
import { listGrants } from "@/lib/accounts";
import { requireAccount, sessionToken } from "@/lib/session";

export const metadata = { title: "Your account" };

export default async function Account() {
  const me = await requireAccount("/account");
  const token = (await sessionToken())!;
  const grants = (await listGrants(token))?.grants ?? [];

  return (
    <>
      <TopBar current="account" />
      <main id="main" className="dash">
        <AccountNav />
        <div className="dash-main">
          <header className="dash-head">
            <h1>Your account</h1>
            <p>{me.displayName ?? me.handle ?? "Your ITC account"} · signed in through the contributor portal.</p>
          </header>

          <section className="panel" aria-labelledby="apps-h">
            <h2 id="apps-h">Connected apps</h2>
            {grants.length ? (
              <ul className="accounts">
                {grants.map((g) => (
                  <li key={g.clientId} className="account">
                    <Avatar name={g.name} />
                    <span className="who">
                      <strong>{g.name}</strong>
                      <small>
                        {g.scopes.map((s) => s.description).join(" · ")}
                        {g.homepage ? <> · <a href={g.homepage} rel="noopener noreferrer">About this app</a></> : null}
                      </small>
                    </span>
                    <form action={disconnectApp}>
                      <input type="hidden" name="clientId" value={g.clientId} />
                      <button type="submit" className="btn ghost small" aria-label={`Disconnect ${g.name}`}>Disconnect</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">You haven’t connected any apps with “Sign in with ITC” yet.</p>
            )}
          </section>

          <section className="panel" aria-labelledby="sess-h">
            <h2 id="sess-h">Sessions</h2>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <form action={signOut}><button type="submit" className="btn ghost">Sign out</button></form>
              <form action={signOutEverywhere}><button type="submit" className="btn ghost">Sign out everywhere</button></form>
            </div>
          </section>
        </div>
      </main>
      <CollectiveBar current="accounts" title="Islamic Tech Collective · ITC Account" />
    </>
  );
}

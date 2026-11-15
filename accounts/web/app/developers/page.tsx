import Link from "next/link";
import { AccountNav } from "@/components/AccountNav";
import { CollectiveBar } from "@/components/CollectiveBar";
import { RegisterAppForm } from "@/components/RegisterAppForm";
import { TopBar } from "@/components/TopBar";
import { listMyApps } from "@/lib/accounts";
import { requireAccount, sessionToken } from "@/lib/session";

export const metadata = { title: "Developers" };

const STATUS_CHIP: Record<string, string> = { approved: "ok", pending: "warn", rejected: "bad" };

export default async function Developers() {
  await requireAccount("/developers");
  const token = (await sessionToken())!;
  const apps = (await listMyApps(token))?.apps ?? [];

  return (
    <>
      <TopBar current="account" />
      <main id="main" className="dash">
        <AccountNav />
        <div className="dash-main">
          <header className="dash-head">
            <h1>Developers</h1>
            <p>
              Register an app to let people sign in with their ITC account. Scopes that only confirm
              who someone is go live at once; anything more waits for a quick staff review. See the{" "}
              <Link href="/docs">integration docs</Link> for how to use "Sign in with ITC" once you have a client.
            </p>
          </header>

          <section className="panel" aria-labelledby="apps-h">
            <h2 id="apps-h">Your apps</h2>
            {apps.length ? (
              <ul className="clist">
                {apps.map((a) => (
                  <li key={a.clientId}>
                    <span className="c-title"><Link href={`/developers/${a.clientId}`}>{a.name}</Link></span>
                    <span className={`chip ${STATUS_CHIP[a.status]}`}>{a.status}</span>
                    <span className="c-meta">
                      <code>{a.clientId}</code><span>·</span><span>{a.type}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No apps yet.</p>
            )}
          </section>

          <section className="panel" aria-labelledby="new-h">
            <h2 id="new-h">Register a new app</h2>
            <div style={{ marginTop: 8 }}><RegisterAppForm /></div>
          </section>
        </div>
      </main>
      <CollectiveBar current="accounts" title="Islamic Tech Collective · ITC Account" />
    </>
  );
}

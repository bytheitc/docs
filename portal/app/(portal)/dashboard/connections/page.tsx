import { signOut, signOutEverywhere, unlinkAccount } from "@/app/(portal)/actions";
import { Avatar } from "@/components/portal/Avatar";
import { availableProviders, providerName } from "@/lib/providers";
import { requireContributor } from "@/lib/portal/session";
import { requirePortalStore } from "@/lib/portal/store";
import { fmtDate, httpUrl } from "@/lib/portal/util";

export const metadata = { title: "Connections" };

const MSG: Record<string, [string, string]> = {
  last: ["You can’t unlink your only account: you’d have no way to sign in. Link another first, or delete your account under Your data.", "bad"],
  taken: ["That account is already linked to another contributor, so it wasn’t linked here. If it’s yours, sign in with it and delete the other profile, or ask a steward.", "bad"],
};

export default async function Connections({ searchParams }: { searchParams: Promise<{ linked?: string; unlinked?: string; error?: string }> }) {
  const me = await requireContributor("/dashboard/connections");
  const sp = await searchParams;
  const accounts = await requirePortalStore().listAccounts(me.id);
  const linkedProviders = new Set(accounts.map((a) => a.provider));
  const more = availableProviders();

  return (
    <>
      <header className="dash-head">
        <h1>Connections</h1>
        <p>We keep each account’s id, username, display name, avatar and profile link. No access tokens are stored.</p>
      </header>
      {sp.linked && <p className="flash ok" role="status">{providerName(sp.linked)} is linked. Any earlier work from that account now counts as yours.</p>}
      {sp.unlinked && <p className="flash ok" role="status">{providerName(sp.unlinked)} was unlinked, and its work detached from your dashboard.</p>}
      {sp.error && MSG[sp.error] && <p className={`flash ${MSG[sp.error][1]}`} role="alert">{MSG[sp.error][0]}</p>}

      <section className="panel" aria-labelledby="linked-h">
        <h2 id="linked-h">Linked accounts</h2>
        <ul className="accounts">
          {accounts.map((a) => {
            const url = a.profileUrl ? httpUrl(a.profileUrl) : null;
            return (
              <li key={`${a.provider}:${a.providerUserId}`} className="account">
                <Avatar name={a.displayName || a.username} url={a.avatarUrl} />
                <span className="who">
                  <strong>{providerName(a.provider)}</strong> · {url ? <a href={url} rel="noopener noreferrer">{a.username}</a> : a.username}
                  <small>Linked {fmtDate(a.linkedAt)}</small>
                </span>
                <form action={unlinkAccount}>
                  <input type="hidden" name="provider" value={a.provider} />
                  <input type="hidden" name="providerUserId" value={a.providerUserId} />
                  <button type="submit" className="btn ghost small" aria-label={`Unlink ${providerName(a.provider)} account ${a.username}`}>Unlink</button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel" aria-labelledby="add-h">
        <h2 id="add-h">Link another platform</h2>
        {more.length ? (
          <div className="provider-buttons">
            {more.map((p) => (
              <a key={p.id} className="btn ghost" href={p.id === "dev" ? `/auth/dev/start?user=${encodeURIComponent(`${me.handle}-alt`.slice(0, 31))}` : `/auth/${p.id}/start`}>
                <span>{linkedProviders.has(p.id) ? `Link another ${p.name} account` : `Link ${p.name}`}</span><span className="cat">{p.category}</span>
              </a>
            ))}
          </div>
        ) : <p className="empty">No platforms are configured on this server.</p>}
      </section>

      <section className="panel" aria-labelledby="sess-h">
        <h2 id="sess-h">Sessions</h2>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <form action={signOut}><button type="submit" className="btn ghost">Sign out</button></form>
          <form action={signOutEverywhere}><button type="submit" className="btn ghost">Sign out everywhere</button></form>
        </div>
      </section>
    </>
  );
}

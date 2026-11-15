import { approveApp, rejectApp, signOutStaff } from "@/app/staff/actions";
import { TopBar } from "@/components/TopBar";
import { listPendingApps } from "@/lib/accounts";
import { PORTAL_URL } from "@/lib/houses";
import { requireStaff } from "@/lib/staff-session";

export const metadata = { title: "Review partner apps" };

export default async function PartnerAppsQueue({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { token, user } = await requireStaff();
  const { error } = await searchParams;
  const apps = (await listPendingApps(token, "pending"))?.apps ?? [];

  return (
    <>
      <TopBar />
      <main id="main" className="dash">
        <div className="dash-main">
          <header className="dash-head">
            <h1>Review partner apps</h1>
            <p>
              Signed in as {user.name} ({user.role}). Approving releases exactly the scopes requested —
              never more. <form action={signOutStaff} style={{ display: "inline" }}><button type="submit" className="linkbtn">Sign out</button></form>
            </p>
          </header>
          {error && <p className="flash bad" role="alert">{error}</p>}

          {apps.length === 0 ? (
            <p className="empty">Nothing waiting on review.</p>
          ) : (
            <ul className="clist">
              {apps.map((a) => (
                <li key={a.clientId}>
                  <span className="c-title">
                    {a.name} <code>{a.clientId}</code>
                  </span>
                  <span className="chip warn">pending</span>
                  <span className="c-meta">
                    <span>By {a.ownerHandle ? <a href={`${PORTAL_URL}/u/${a.ownerHandle}`}>{a.ownerHandle}</a> : a.ownerAccountId}</span>
                    <span>·</span>
                    <span>{a.type}</span>
                    <span>·</span>
                    <span>Requests: {a.requestedScopes.join(", ")}</span>
                    {a.homepage && <><span>·</span><a href={a.homepage} rel="noopener noreferrer">{a.homepage}</a></>}
                  </span>
                  <span className="c-desc">Redirects: {a.redirectUris.join(", ")}</span>
                  <div className="row-actions">
                    <form action={approveApp}>
                      <input type="hidden" name="clientId" value={a.clientId} />
                      <button type="submit" className="btn small">Approve</button>
                    </form>
                    <RejectForm clientId={a.clientId} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function RejectForm({ clientId }: { clientId: string }) {
  return (
    <form action={rejectApp} className="inline-form">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="text" name="reason" placeholder="Reason (shown to the owner)" maxLength={500} />
      <button type="submit" className="btn small danger">Reject</button>
    </form>
  );
}

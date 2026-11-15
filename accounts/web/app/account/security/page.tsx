import { disableTotp, removePassword, removePasskey } from "@/app/account/security/actions";
import { AccountNav } from "@/components/AccountNav";
import { AddPasskeyButton } from "@/components/AddPasskeyButton";
import { CollectiveBar } from "@/components/CollectiveBar";
import { PasswordForm } from "@/components/PasswordForm";
import { RecoveryCodesPanel } from "@/components/RecoveryCodesPanel";
import { TopBar } from "@/components/TopBar";
import { TotpSetup } from "@/components/TotpSetup";
import { getCredentials } from "@/lib/accounts";
import { requireAccount, sessionToken } from "@/lib/session";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Security" };

export default async function Security() {
  await requireAccount("/account/security");
  const token = (await sessionToken())!;
  const creds = await getCredentials(token);

  return (
    <>
      <TopBar current="account" />
      <main id="main" className="dash">
        <AccountNav />
        <div className="dash-main">
          <header className="dash-head">
            <h1>Security</h1>
            <p>
              These are additional ways into your ITC account — signing in through the contributor
              portal always keeps working too, no matter what you set up here.
            </p>
          </header>

          <section className="panel" aria-labelledby="passkeys-h">
            <h2 id="passkeys-h">Passkeys</h2>
            <p className="muted">A passkey signs you in on this device without a password — with your face, fingerprint or device PIN.</p>
            {creds && creds.passkeys.length > 0 && (
              <ul className="accounts" style={{ marginTop: 12 }}>
                {creds.passkeys.map((p) => (
                  <li key={p.credentialId} className="account">
                    <span className="who">
                      <strong>{p.name}</strong>
                      <small>Added {fmtDate(p.createdAt)}{p.lastUsedAt ? ` · last used ${fmtDate(p.lastUsedAt)}` : ""}</small>
                    </span>
                    <form action={removePasskey}>
                      <input type="hidden" name="credentialId" value={p.credentialId} />
                      <button type="submit" className="btn ghost small" aria-label={`Remove passkey ${p.name}`}>Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 12 }}><AddPasskeyButton /></div>
          </section>

          <section className="panel" aria-labelledby="password-h">
            <h2 id="password-h">Password</h2>
            {creds?.password ? (
              <>
                <p className="muted">A password is set on this account.</p>
                <div style={{ marginTop: 12 }}><PasswordForm hasPassword /></div>
                <form action={removePassword} style={{ marginTop: 12 }}>
                  <button type="submit" className="btn ghost small">Remove password</button>
                </form>
              </>
            ) : (
              <div style={{ marginTop: 4 }}><PasswordForm hasPassword={false} /></div>
            )}
          </section>

          <section className="panel" aria-labelledby="totp-h">
            <h2 id="totp-h">Two-factor authentication</h2>
            {creds?.totp ? (
              <>
                <p className="flash ok" role="status">Two-factor is on, for password sign-ins.</p>
                <form action={disableTotp} style={{ marginTop: 12 }}>
                  <button type="submit" className="btn ghost small">Turn off two-factor</button>
                </form>
              </>
            ) : (
              <>
                <p className="muted">Ask for a code from an authenticator app whenever someone signs in with your password.</p>
                <div style={{ marginTop: 12 }}><TotpSetup /></div>
              </>
            )}
          </section>

          {creds?.totp && (
            <section className="panel" aria-labelledby="recovery-h">
              <h2 id="recovery-h">Recovery codes</h2>
              <RecoveryCodesPanel remaining={creds.recoveryCodesRemaining} />
            </section>
          )}
        </div>
      </main>
      <CollectiveBar current="accounts" title="Islamic Tech Collective · ITC Account" />
    </>
  );
}

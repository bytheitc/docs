"use client";
// Enabling two-factor: generate a secret, show it as a QR code (rendered entirely client-side —
// the secret never leaves the browser to draw it), then prove it was scanned before it counts as
// on. The QR render is the one place this needs to be a client component rather than plain forms.
import { useState } from "react";
import QRCode from "qrcode";
import { confirmTotp, enrollTotp, type ActionState } from "@/app/account/security/actions";

export function TotpSetup() {
  const [step, setStep] = useState<"idle" | "scan" | "done">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const result = await enrollTotp();
    setBusy(false);
    if (!result.ok || !result.otpauthUrl || !result.secret) return setError(result.message ?? "Couldn't start.");
    setSecret(result.secret);
    setQr(await QRCode.toDataURL(result.otpauthUrl, { width: 220 }));
    setStep("scan");
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    const result: ActionState = await confirmTotp({}, fd);
    setBusy(false);
    if (!result.ok) return setError(result.message ?? "That code wasn't right.");
    setRecoveryCodes(result.recoveryCodes ?? []);
    setStep("done");
  }

  if (step === "done" && recoveryCodes) {
    return (
      <div>
        <p className="flash ok" role="status">Two-factor is on.</p>
        <p className="help" style={{ marginTop: 10 }}>Recovery codes — save these somewhere safe. Each works once, if you lose your authenticator.</p>
        <pre className="panel" style={{ marginTop: 8, fontSize: 14, userSelect: "all" }}>{recoveryCodes.join("\n")}</pre>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <form className="form" onSubmit={confirm}>
        {qr && <img src={qr} alt="QR code for your authenticator app" width={220} height={220} />}
        <p className="help">Can’t scan it? Enter this key by hand: <code>{secret}</code></p>
        <div className="field">
          <label htmlFor="totp-code">Enter the 6-digit code it shows</label>
          <input id="totp-code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
        </div>
        {error && <p className="flash bad" role="alert">{error}</p>}
        <button type="submit" className="btn" disabled={busy}>{busy ? "Checking…" : "Turn on two-factor"}</button>
      </form>
    );
  }

  return (
    <div>
      <button type="button" className="btn ghost small" onClick={start} disabled={busy}>{busy ? "Starting…" : "Set up two-factor"}</button>
      {error && <p className="err" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}

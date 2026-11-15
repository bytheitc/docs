"use client";
// A password (+ TOTP or a recovery code, if it's on) sign-in. A two-step form rather than a
// server action: the second step only appears once the api says a code is needed, which a plain
// progressively-enhanced form can't branch on without a round trip anyway.
import { useState } from "react";

export function PasswordSignInForm({ next }: { next: string }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle, password, ...(needsTotp ? { code } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "That handle and password didn't match.");
      if (body.needsTotp) {
        setNeedsTotp(true);
        return;
      }
      window.location.assign(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="handle">ITC handle</label>
        <input id="handle" type="text" value={handle} onChange={(e) => setHandle(e.target.value)} disabled={needsTotp} required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={needsTotp} required autoComplete="current-password" />
      </div>
      {needsTotp && (
        <div className="field">
          <label htmlFor="code">Two-factor code, or a recovery code</label>
          <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="one-time-code" autoFocus />
        </div>
      )}
      {error && <p className="flash bad" role="alert">{error}</p>}
      <button type="submit" className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

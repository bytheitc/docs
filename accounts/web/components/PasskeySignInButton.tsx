"use client";
// Signs in with whichever discoverable passkey the browser has for this site — no handle, no
// password. The ceremony itself only runs in a browser, so this can't be a server action.
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export function PasskeySignInButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/webauthn/login/options", { method: "POST" });
      if (!optionsRes.ok) throw new Error("Passkey sign-in isn't available right now.");
      const { options, flowId } = await optionsRes.json();

      const response = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flowId, response }),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json().catch(() => ({}))).error ?? "That passkey didn't work.");

      window.location.assign(next);
    } catch (e) {
      setError(e instanceof Error && e.name === "NotAllowedError" ? "Cancelled." : (e as Error).message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn" onClick={go} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Checking…" : "Sign in with a passkey"}
      </button>
      {error && <p className="err" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}

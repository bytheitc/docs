"use client";
// Registers a new passkey. The ceremony itself (navigator.credentials.create) only runs in a
// browser, so this is the one piece of account/security that can't be a server action.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

export function AddPasskeyButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/webauthn/register/options", { method: "POST" });
      if (!optionsRes.ok) throw new Error((await optionsRes.json().catch(() => ({}))).error ?? "Couldn't start.");
      const optionsJSON = await optionsRes.json();

      const response = await startRegistration({ optionsJSON });

      const name = window.prompt("Name this passkey (e.g. “My laptop”)", "Passkey") || "Passkey";
      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, name }),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json().catch(() => ({}))).error ?? "Couldn't verify.");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.name === "NotAllowedError" ? "Cancelled." : (e as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn ghost small" onClick={add} disabled={busy}>
        {busy ? "Adding…" : "Add a passkey"}
      </button>
      {error && <p className="err" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}

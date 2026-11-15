"use client";
import { useState } from "react";
import { regenerateSecret } from "@/app/developers/actions";

export function RegenerateSecretButton({ clientId }: { clientId: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!window.confirm("This invalidates the current secret immediately. Continue?")) return;
    setBusy(true);
    const result = await regenerateSecret(clientId);
    setBusy(false);
    if (result.ok) setSecret(result.secret ?? null);
  }

  if (secret) {
    return (
      <div>
        <p className="help">New secret — save it now, it won’t be shown again:</p>
        <pre className="panel" style={{ marginTop: 4, fontSize: 14, userSelect: "all" }}>{secret}</pre>
      </div>
    );
  }

  return <button type="button" className="btn ghost small" onClick={go} disabled={busy}>{busy ? "Working…" : "Regenerate secret"}</button>;
}

"use client";
// Regenerating recovery codes shows the new batch exactly once, which needs to live in client
// state rather than a page reload.
import { useState } from "react";
import { regenerateRecoveryCodes } from "@/app/account/security/actions";

export function RecoveryCodesPanel({ remaining }: { remaining: number }) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (codes && !window.confirm("This replaces every unused recovery code. Continue?")) return;
    setBusy(true);
    const result = await regenerateRecoveryCodes();
    setBusy(false);
    if (result.ok) setCodes(result.recoveryCodes ?? []);
  }

  if (codes) {
    return (
      <div>
        <p className="help">Save these somewhere safe — they won’t be shown again.</p>
        <pre className="panel" style={{ marginTop: 8, fontSize: 14, userSelect: "all" }}>{codes.join("\n")}</pre>
      </div>
    );
  }

  return (
    <div>
      <p className="muted">{remaining} unused recovery code{remaining === 1 ? "" : "s"}.</p>
      <button type="button" className="btn ghost small" onClick={regenerate} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "Generating…" : "Generate new recovery codes"}
      </button>
    </div>
  );
}

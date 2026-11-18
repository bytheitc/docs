"use client";
import { useActionState, useState } from "react";
import { sendCampaignAction, type FormState } from "@/app/staff/actions";

export function SendCampaignButton({ id, canSend, missingFields }: { id: string; canSend: boolean; missingFields: string[] }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(sendCampaignAction, {});

  if (!canSend) {
    return <p className="flash info">Sending needs the publisher role. Ask an administrator.</p>;
  }

  if (!confirming) {
    return <button type="button" className="btn danger" onClick={() => setConfirming(true)}>Send campaign</button>;
  }

  return (
    <form action={action} className="form" style={{ gap: 10 }}>
      <input type="hidden" name="id" value={id} />
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      <p className="flash bad">Are you sure? This sends real email to every subscribed contact.</p>
      {missingFields.length > 0 && (
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" name="acknowledgeMissingFields" required style={{ marginTop: 3 }} />
          <span>
            I understand {missingFields.map((k) => `{{${k}}}`).join(", ")} will be blank for every recipient, because this list has no such
            column.
          </span>
        </label>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn danger" disabled={pending}>{pending ? "Sending…" : "Yes, send now"}</button>
        <button type="button" className="btn ghost" onClick={() => setConfirming(false)} disabled={pending}>Cancel</button>
      </div>
    </form>
  );
}

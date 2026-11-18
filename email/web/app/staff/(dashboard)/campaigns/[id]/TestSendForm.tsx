"use client";
import { useActionState } from "react";
import { testCampaignAction, type FormState } from "@/app/staff/actions";

export function TestSendForm({ id, defaultTo }: { id: string; defaultTo: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(testCampaignAction, {});
  return (
    <form action={action} className="form" style={{ maxWidth: 480 }}>
      <input type="hidden" name="id" value={id} />
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      {state.message && <p className="flash ok" role="status">{state.message}</p>}
      <div className="field">
        <label htmlFor="test-to">Send a test to</label>
        <input id="test-to" name="to" type="email" defaultValue={defaultTo} required autoComplete="email" />
      </div>
      <button type="submit" className="btn ghost" disabled={pending}>{pending ? "Sending test…" : "Send test"}</button>
    </form>
  );
}

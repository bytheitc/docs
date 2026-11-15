"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateApp, type ActionState } from "@/app/developers/actions";
import type { PartnerApp } from "@/lib/accounts";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn ghost small" disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}

export function EditAppForm({ app }: { app: PartnerApp }) {
  const [state, action] = useActionState<ActionState, FormData>(updateApp.bind(null, app.clientId), {});
  return (
    <form action={action} className="form" key={state.message ?? "edit"}>
      {state.message && <p className={`flash ${state.ok ? "ok" : "bad"}`} role={state.ok ? "status" : "alert"}>{state.message}</p>}
      <div className="field">
        <label htmlFor="name">App name</label>
        <input id="name" name="name" type="text" maxLength={80} defaultValue={app.name} required />
      </div>
      <div className="field">
        <label htmlFor="homepage">Homepage</label>
        <input id="homepage" name="homepage" type="url" maxLength={300} defaultValue={app.homepage} />
      </div>
      <div className="field">
        <label htmlFor="redirectUris">Redirect URIs, one per line</label>
        <textarea id="redirectUris" name="redirectUris" rows={3} defaultValue={app.redirectUris.join("\n")} required />
        {state.errors?.redirectUris && <p className="err">{state.errors.redirectUris}</p>}
      </div>
      <Submit />
    </form>
  );
}

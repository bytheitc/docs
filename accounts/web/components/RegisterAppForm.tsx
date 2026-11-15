"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerApp, type ActionState } from "@/app/developers/actions";

const SCOPES = [
  { id: "profile", label: "Profile", help: "Handle, display name, avatar" },
  { id: "contributions", label: "Contributions", help: "The work recorded in their name" },
  { id: "entitlements", label: "Entitlements", help: "Tier and what their account unlocks — reviewed" },
  { id: "offline_access", label: "Stay signed in", help: "A refresh token, so they don't re-authorize every visit" },
];

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn" disabled={pending}>{pending ? "Registering…" : "Register app"}</button>;
}

export function RegisterAppForm() {
  const [state, action] = useActionState<ActionState, FormData>(registerApp, {});

  if (state.ok && state.client) {
    return (
      <div className="flash ok" role="status">
        <p>{state.message}</p>
        <p style={{ marginTop: 8 }}>Client ID: <code>{state.client.clientId}</code></p>
        {state.secret && (
          <>
            <p className="help" style={{ marginTop: 8 }}>
              Client secret — save it now, it won’t be shown again:
            </p>
            <pre className="panel" style={{ marginTop: 4, fontSize: 14, userSelect: "all" }}>{state.secret}</pre>
          </>
        )}
        <p style={{ marginTop: 12 }}>
          <Link href={`/developers/${state.client.clientId}`} className="btn small">View this app &amp; the quickstart</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="form">
      {state.message && !state.ok && <p className="flash bad" role="alert">{state.message}</p>}
      <div className="field">
        <label htmlFor="name">App name</label>
        <input id="name" name="name" type="text" maxLength={80} required placeholder="e.g. Zakat Helper" aria-invalid={state.errors?.name ? true : undefined} />
        {state.errors?.name && <p className="err">{state.errors.name}</p>}
      </div>
      <div className="field">
        <label htmlFor="homepage">Homepage (optional)</label>
        <input id="homepage" name="homepage" type="url" maxLength={300} placeholder="https://" aria-invalid={state.errors?.homepage ? true : undefined} />
        {state.errors?.homepage && <p className="err">{state.errors.homepage}</p>}
      </div>
      <div className="field">
        <label htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue="public">
          <option value="public">Public — a browser app or native app, can't keep a secret</option>
          <option value="confidential">Confidential — a server that can</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="redirectUris">Redirect URIs, one per line</label>
        <textarea id="redirectUris" name="redirectUris" rows={3} required placeholder="https://example.org/callback" aria-invalid={state.errors?.redirectUris ? true : undefined} />
        <p className="help">Matched exactly. https anywhere; http only on localhost; a private scheme for installed apps.</p>
        {state.errors?.redirectUris && <p className="err">{state.errors.redirectUris}</p>}
      </div>
      <fieldset className="field">
        <legend className="label">Scopes</legend>
        <p className="help">openid is always included — it's what confirms who someone is.</p>
        {SCOPES.map((s) => (
          <label key={s.id} className="check">
            <input type="checkbox" name="scopes" value={s.id} />
            <span>{s.label} <small>{s.help}</small></span>
          </label>
        ))}
        <p className="help">Asking for anything past Profile holds the app for a staff reviewer before it can sign anyone in.</p>
      </fieldset>
      <Submit />
    </form>
  );
}

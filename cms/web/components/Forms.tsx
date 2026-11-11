"use client";
// Small action-backed forms (ported from the per-app kit; accounts now carry spaces).
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { changePassword, createUser, login, setup, type FormState } from "@/app/actions";
import { ROLES } from "@/lib/types";

function Submit({ children, className = "cms-btn primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? "Working…" : children}</button>;
}

function Flash({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <p className={`cms-flash ${state.ok ? "ok" : "bad"}`} role={state.ok ? "status" : "alert"}>{state.message}</p>;
}

function Input({ name, label, type = "text", state, autoComplete, help }: { name: string; label: string; type?: string; state: FormState; autoComplete?: string; help?: string }) {
  const err = state.errors?.[name];
  return (
    <div className="cms-field">
      <label className="cms-label" htmlFor={`in-${name}`}>{label}</label>
      <input id={`in-${name}`} name={name} type={type} autoComplete={autoComplete} required aria-invalid={err ? true : undefined} aria-describedby={err ? `in-${name}-err` : undefined} />
      {help && <p className="cms-help">{help}</p>}
      {err && <p id={`in-${name}-err`} className="cms-err">{err}</p>}
    </div>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="cms-auth-form">
      <Flash state={state} />
      <Input name="email" label="Email" type="email" autoComplete="username" state={state} />
      <Input name="password" label="Password" type="password" autoComplete="current-password" state={state} />
      <Submit>Sign in</Submit>
    </form>
  );
}

export function SetupForm({ needsToken }: { needsToken: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(setup, {});
  return (
    <form action={action} className="cms-auth-form">
      <Flash state={state} />
      {needsToken && <Input name="token" label="Setup token" type="password" state={state} help="The value of CMS_SETUP_TOKEN on the CMS api server." />}
      <Input name="name" label="Your name" autoComplete="name" state={state} />
      <Input name="email" label="Email" type="email" autoComplete="username" state={state} />
      <Input name="password" label="Password" type="password" autoComplete="new-password" state={state} help="At least 12 characters." />
      <Submit>Create the first admin</Submit>
    </form>
  );
}

/** Checkboxes for which spaces an account may open. "All spaces" covers spaces registered later too. */
export function SpacePicker({ spaces, value, idPrefix, disabled }: { spaces: { id: string; label: string }[]; value: "*" | string[]; idPrefix: string; disabled?: boolean }) {
  const [all, setAll] = useState(value === "*");
  return (
    <fieldset className="cms-spaces" disabled={disabled}>
      <legend className="cms-label">Spaces</legend>
      <label className="cms-multi-item">
        <input type="checkbox" name="allSpaces" id={`${idPrefix}-all`} checked={all} onChange={(e) => setAll(e.target.checked)} />
        <span>All spaces</span>
      </label>
      {!all && spaces.map((sp) => (
        <label key={sp.id} className="cms-multi-item">
          <input type="checkbox" name="space" value={sp.id} defaultChecked={value !== "*" && value.includes(sp.id)} />
          <span>{sp.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function NewUserForm({ spaces }: { spaces: { id: string; label: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createUser, {});
  return (
    <form action={action} className="cms-inline-form" key={state.ok ? state.message : "form"}>
      <Flash state={state} />
      <div className="cms-grid-4">
        <Input name="name" label="Name" state={state} />
        <Input name="email" label="Email" type="email" state={state} />
        <div className="cms-field">
          <label className="cms-label" htmlFor="in-role">Role</label>
          <select id="in-role" name="role" defaultValue="editor">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {state.errors?.role && <p className="cms-err">{state.errors.role}</p>}
        </div>
        <Input name="password" label="Temporary password" type="password" autoComplete="new-password" state={state} />
      </div>
      <SpacePicker spaces={spaces} value={[]} idPrefix="new" />
      {state.errors?.spaces && <p className="cms-err">{state.errors.spaces}</p>}
      <p className="cms-help">Admins always have every space.</p>
      <Submit>Add person</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="cms-auth-form" key={state.ok ? "done" : "form"}>
      <Flash state={state} />
      <Input name="current" label="Current password" type="password" autoComplete="current-password" state={state} />
      <Input name="next" label="New password" type="password" autoComplete="new-password" state={state} help="At least 12 characters." />
      <Submit>Change password</Submit>
    </form>
  );
}

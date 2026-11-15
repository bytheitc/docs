"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setPassword, type ActionState } from "@/app/account/security/actions";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn ghost small" disabled={pending}>{pending ? "Saving…" : children}</button>;
}

function Flash({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`flash ${state.ok ? "ok" : "bad"}`} role={state.ok ? "status" : "alert"} style={{ marginTop: 8 }}>{state.message}</p>;
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(setPassword, {});
  return (
    <form action={action} className="form" key={state.ok ? state.message : "password"}>
      <div className="grid2">
        <div className="field">
          <label htmlFor="password">{hasPassword ? "New password" : "Password"}</label>
          <input id="password" name="password" type="password" minLength={8} maxLength={200} required autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm</label>
          <input id="confirm" name="confirm" type="password" minLength={8} maxLength={200} required autoComplete="new-password" aria-invalid={state.errors?.confirm ? true : undefined} />
          {state.errors?.confirm && <p className="err">{state.errors.confirm}</p>}
        </div>
      </div>
      <Flash state={state} />
      <Submit>{hasPassword ? "Change password" : "Set password"}</Submit>
    </form>
  );
}

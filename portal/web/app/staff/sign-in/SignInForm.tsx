"use client";
import { useActionState } from "react";
import { signInStaff, type StaffFormState } from "../actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(signInStaff, {});
  return (
    <form action={action} className="cms-fields">
      <input type="hidden" name="next" value={next} />
      {state.error && <p className="cms-flash bad" role="alert">{state.error}</p>}
      <label className="cms-field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="cms-field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="cms-btn primary" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import { signInStaff, type StaffFormState } from "@/app/staff/actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(signInStaff, {});
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import { createListAction, type FormState } from "@/app/staff/actions";

export function NewListForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createListAction, {});
  return (
    <form action={action} className="form" style={{ maxWidth: 420 }}>
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required placeholder="November newsletter" />
      </div>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Creating…" : "Create list"}</button>
    </form>
  );
}

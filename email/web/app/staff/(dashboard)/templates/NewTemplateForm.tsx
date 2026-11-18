"use client";
import { useActionState } from "react";
import { createTemplateAction, type FormState } from "@/app/staff/actions";

export function NewTemplateForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createTemplateAction, {});
  return (
    <form action={action} className="form" style={{ maxWidth: 420 }}>
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required placeholder="November newsletter" />
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" type="text" required placeholder="Hi {{first_name}}, what's new at ITC" />
      </div>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Creating…" : "Create template"}</button>
    </form>
  );
}

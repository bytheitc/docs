"use client";
import { useActionState } from "react";
import { createCampaignAction, type FormState } from "@/app/staff/actions";
import type { EmailList, Template } from "@/lib/email";

export function NewCampaignForm({ templates, lists }: { templates: Template[]; lists: EmailList[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCampaignAction, {});
  return (
    <form action={action} className="form" style={{ maxWidth: 420 }}>
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required placeholder="November newsletter — send" />
      </div>
      <div className="field">
        <label htmlFor="templateId">Template</label>
        <select id="templateId" name="templateId" required defaultValue="">
          <option value="" disabled>Choose a template</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="listId">List</label>
        <select id="listId" name="listId" required defaultValue="">
          <option value="" disabled>Choose a list</option>
          {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.contactCount})</option>)}
        </select>
      </div>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Creating…" : "Create draft"}</button>
    </form>
  );
}

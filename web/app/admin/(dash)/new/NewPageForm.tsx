"use client";
import { useActionState, useState } from "react";
import { createPage, type FormState } from "@/app/admin/actions";

const toSlug = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function NewPageForm({ sections }: { sections: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPage, {});
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <form action={action}>
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required maxLength={120} value={title} onChange={(e) => { setTitle(e.target.value); if (!touched) setSlug(toSlug(e.target.value)); }} autoFocus />
        {state.fields?.title && <span className="err">{state.fields.title}</span>}
      </div>
      <div className="field">
        <label htmlFor="slug">Address</label>
        <input id="slug" name="slug" required value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} placeholder="products/new-thing" />
        <small>Lowercase letters, numbers and dashes; use / for a folder. The page will be at /{slug || "…"}.</small>
        {state.fields?.slug && <span className="err">{state.fields.slug}</span>}
      </div>
      <div className="field">
        <label htmlFor="section">Sidebar section</label>
        <select id="section" name="section" defaultValue="">
          <option value="">Not in the sidebar yet (a draft)</option>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <input id="description" name="description" maxLength={300} placeholder="One sentence, shown under the title and in search." />
      </div>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Creating…" : "Create and edit"}</button>
    </form>
  );
}

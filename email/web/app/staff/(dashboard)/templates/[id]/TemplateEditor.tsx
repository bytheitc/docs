"use client";
import { useActionState, useState } from "react";
import { previewTemplateAction, updateTemplateAction, type FormState } from "@/app/staff/actions";
import type { Template } from "@/lib/email";

export function TemplateEditor({ template }: { template: Template }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateTemplateAction, {});
  const [bodyMarkdown, setBodyMarkdown] = useState(template.bodyMarkdown);
  const [sampleFields, setSampleFields] = useState('{\n  "first_name": "Amina"\n}');
  const [preview, setPreview] = useState<{ html?: string; error?: string }>({});
  const [previewing, setPreviewing] = useState(false);

  async function runPreview() {
    setPreviewing(true);
    try {
      setPreview(await previewTemplateAction(bodyMarkdown, sampleFields));
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24 }}>
      <section className="panel">
        <h2>Source</h2>
        <form action={action} className="form">
          <input type="hidden" name="id" value={template.id} />
          {state.error && <p className="flash bad" role="alert">{state.error}</p>}
          {state.message && <p className="flash ok" role="status">{state.message}</p>}
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" defaultValue={template.name} required />
          </div>
          <div className="field">
            <label htmlFor="subject">Subject</label>
            <input id="subject" name="subject" type="text" defaultValue={template.subject} required />
          </div>
          <div className="field">
            <label htmlFor="bodyMarkdown">Body (Markdown)</label>
            <textarea
              id="bodyMarkdown"
              name="bodyMarkdown"
              rows={16}
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              placeholder={"# Hi {{first_name|friend}}\n\nSomething worth telling people.\n\n[Read the full update](https://example.org)"}
            />
            <p className="help">
              <code>{"{{first_name}}"}</code> inserts a column from the list&apos;s CSV. Add a fallback for contacts without one:{" "}
              <code>{"{{first_name|friend}}"}</code>. A line that is only <code>[Label](https://…)</code> becomes a button.
            </p>
          </div>
          <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </form>
      </section>

      <section className="panel">
        <h2>Preview</h2>
        <div className="field">
          <label htmlFor="sampleFields">Sample fields (JSON)</label>
          <textarea id="sampleFields" rows={4} value={sampleFields} onChange={(e) => setSampleFields(e.target.value)} />
        </div>
        <button type="button" className="btn ghost small" onClick={runPreview} disabled={previewing} style={{ marginTop: 8 }}>
          {previewing ? "Rendering…" : "Render preview"}
        </button>
        {preview.error && <p className="flash bad" style={{ marginTop: 12 }}>{preview.error}</p>}
        {preview.html && (
          <iframe className="preview-frame" style={{ marginTop: 12 }} srcDoc={preview.html} title="Email preview" sandbox="" />
        )}
      </section>
    </div>
  );
}

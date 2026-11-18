"use client";
import { useActionState, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { savePage, type FormState } from "@/app/admin/actions";
import { renderMarkdown } from "@/lib/markdown";

type View = "split" | "write" | "preview";
interface Props { page: { slug: string; title: string; description: string; markdown: string; sha: string }; side: React.ReactNode }

/** Wraps the selection in the textarea, or inserts a block on its own lines. */
function apply(el: HTMLTextAreaElement, set: (v: string) => void, kind: string) {
  const { selectionStart: a, selectionEnd: b, value } = el;
  const sel = value.slice(a, b);
  const line = (text: string) => {
    const before = a > 0 && value[a - 1] !== "\n" ? "\n\n" : "";
    return before + text + "\n";
  };
  const edits: Record<string, () => [string, number, number]> = {
    h2: () => { const t = line(`## ${sel || "Heading"}`); return [t, t.length - 1 - (sel || "Heading").length, t.length - 1]; },
    h3: () => { const t = line(`### ${sel || "Heading"}`); return [t, t.length - 1 - (sel || "Heading").length, t.length - 1]; },
    bold: () => [`**${sel || "bold text"}**`, 2, 2 + (sel || "bold text").length],
    code: () => [`\`${sel || "code"}\``, 1, 1 + (sel || "code").length],
    link: () => [`[${sel || "link text"}](/page)`, 3 + (sel || "link text").length, 8 + (sel || "link text").length],
    list: () => { const t = line((sel || "First item\nSecond item").split("\n").map((l) => `- ${l}`).join("\n")); return [t, t.length, t.length]; },
    block: () => { const t = line("```ts\n" + (sel || "// code") + "\n```"); return [t, t.length, t.length]; },
    note: () => { const t = line(`> [!NOTE]\n> ${sel || "Something worth knowing."}`); return [t, t.length, t.length]; },
    table: () => { const t = line("| Column | Column |\n|---|---|\n| Cell | Cell |"); return [t, t.length, t.length]; },
  };
  const [text, s, e] = edits[kind]();
  const next = value.slice(0, a) + text + value.slice(b);
  set(next);
  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + s, a + e); });
}

export function Editor({ page, side }: Props) {
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description);
  const [markdown, setMarkdown] = useState(page.markdown);
  const [sha, setSha] = useState(page.sha);
  const [saved, setSaved] = useState({ title: page.title, description: page.description, markdown: page.markdown });
  const [view, setView] = useState<View>("split");
  const [state, action, pending] = useActionState<FormState, FormData>(savePage, {});
  const area = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const deferred = useDeferredValue(markdown);
  const html = useMemo(() => renderMarkdown(deferred), [deferred]);
  const dirty = title !== saved.title || description !== saved.description || markdown !== saved.markdown;

  useEffect(() => {
    if (state.sha) {
      setSha(state.sha);
      setSaved({ title, description, markdown });
    }
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (dirty && !pending) form.current?.requestSubmit(); }
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", key); };
  }, [dirty, pending]);

  const tool = (kind: string, label: string, title?: string) => (
    <button type="button" title={title ?? label} onClick={() => area.current && apply(area.current, setMarkdown, kind)}>{label}</button>
  );

  return (
    // The page form wraps only the writing area; the side panel holds other forms (move, delete),
    // and forms can't nest, so the save controls join this form through the `form` attribute.
    <div className="editor">
      <form ref={form} id="page-form" action={action} className="editor-main">
      <input type="hidden" name="slug" value={page.slug} />
      <input type="hidden" name="sha" value={sha} />
        <div className="editor-meta">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
            {state.fields?.title && <span className="err">{state.fields.title}</span>}
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="One sentence, shown under the title and in search." />
          </div>
        </div>
        <div className="editor-pane">
          <div className="editor-bar" role="toolbar" aria-label="Formatting">
            {tool("h2", "H2", "Section heading")}{tool("h3", "H3", "Sub-heading")}{tool("bold", "B", "Bold")}{tool("code", "`code`", "Inline code")}{tool("link", "Link")}
            <span className="sep" />
            {tool("list", "List")}{tool("block", "Code block")}{tool("table", "Table")}{tool("note", "Callout")}
            <span className="grow" />
            {(["write", "split", "preview"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "split" ? "Side by side" : v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          <div className="editor-split" data-view={view}>
            <textarea ref={area} name="markdown" value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck aria-label="Page text, in Markdown"
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const el = e.currentTarget; const { selectionStart: a, selectionEnd: b } = el;
                  setMarkdown(markdown.slice(0, a) + "  " + markdown.slice(b));
                  requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
                }
              }} />
            {/* Rendered by the same function as the public page, which escapes raw HTML. */}
            <div className="preview" aria-label="Preview"><div className="prose" dangerouslySetInnerHTML={{ __html: html }} /></div>
          </div>
        </div>
        {state.fields?.markdown && <p className="flash bad">{state.fields.markdown}</p>}
      </form>
      <aside className="editor-side">
        <div className="card save-row">
          <h3>Save</h3>
          {state.error && <p className="flash bad" role="alert" style={{ margin: 0 }}>{state.error}</p>}
          {state.message && !dirty && <p className="flash ok" role="status" style={{ margin: 0 }}>{state.message}</p>}
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="message">What changed?</label>
            <input id="message" name="message" form="page-form" placeholder={`Update “${title || page.title}”`} maxLength={200} />
            <small>Becomes the commit message. Optional.</small>
          </div>
          <button type="submit" form="page-form" className="btn" disabled={!dirty || pending}>{pending ? "Saving…" : dirty ? "Save and publish" : "No changes"}</button>
          <small style={{ color: "var(--ink-3)", fontSize: 12.5 }}><kbd>⌘S</kbd> saves. {dirty ? "You have unsaved changes." : ""}</small>
        </div>
        {side}
      </aside>
    </div>
  );
}

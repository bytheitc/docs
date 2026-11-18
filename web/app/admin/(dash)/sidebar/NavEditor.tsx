"use client";
import { useActionState, useEffect, useState } from "react";
import { saveSidebar, type FormState } from "@/app/admin/actions";
import type { RawNav } from "@/lib/api";

export function NavEditor({ initial, sha: firstSha, titles, canSave }: { initial: RawNav; sha: string | null; titles: Record<string, string>; canSave: boolean }) {
  const [nav, setNav] = useState<RawNav>(initial);
  const [sha, setSha] = useState(firstSha);
  const [state, action, pending] = useActionState<FormState, FormData>(saveSidebar, {});
  useEffect(() => { if (state.sha) setSha(state.sha); }, [state]);

  const listed = new Set(nav.sections.flatMap((s) => s.pages));
  const unlisted = Object.keys(titles).filter((s) => !listed.has(s)).sort();
  const update = (fn: (n: RawNav) => void) => setNav((prev) => { const next = structuredClone(prev); fn(next); return next; });
  const moveIn = (si: number, pi: number, d: number) => update((n) => { const p = n.sections[si].pages; const j = pi + d; if (j < 0 || j >= p.length) return; [p[pi], p[j]] = [p[j], p[pi]]; });
  const moveSection = (si: number, d: number) => update((n) => { const j = si + d; if (j < 0 || j >= n.sections.length) return; [n.sections[si], n.sections[j]] = [n.sections[j], n.sections[si]]; });

  return (
    <form action={action} className="nav-editor">
      <input type="hidden" name="nav" value={JSON.stringify(nav)} />
      <input type="hidden" name="sha" value={sha ?? ""} />
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      {state.message && <p className="flash ok" role="status">{state.message}</p>}
      {nav.sections.map((s, si) => (
        <section key={si} className="card nav-section">
          <div className="nav-section-head">
            <input className="input" value={s.title} aria-label="Section title" onChange={(e) => update((n) => { n.sections[si].title = e.target.value; })} />
            <button type="button" className="btn ghost small" onClick={() => moveSection(si, -1)} aria-label="Move section up">↑</button>
            <button type="button" className="btn ghost small" onClick={() => moveSection(si, 1)} aria-label="Move section down">↓</button>
            <button type="button" className="btn ghost small" onClick={() => update((n) => { n.sections.splice(si, 1); })} disabled={s.pages.length > 0} title={s.pages.length ? "Move its pages out first" : "Remove section"}>Remove</button>
          </div>
          <ul className="nav-pages">
            {s.pages.map((p, pi) => (
              <li key={p}>
                <b>{titles[p] ?? p}</b><code>/{p}</code>
                <button type="button" className="btn ghost small" onClick={() => moveIn(si, pi, -1)} aria-label={`Move ${titles[p] ?? p} up`}>↑</button>
                <button type="button" className="btn ghost small" onClick={() => moveIn(si, pi, 1)} aria-label={`Move ${titles[p] ?? p} down`}>↓</button>
                <select aria-label="Move to section" value={si} onChange={(e) => update((n) => { const to = Number(e.target.value); n.sections[si].pages.splice(pi, 1); if (to >= 0) n.sections[to].pages.push(p); })}>
                  {nav.sections.map((x, i) => <option key={i} value={i}>{x.title || "(untitled)"}</option>)}
                  <option value={-1}>Take out of the sidebar</option>
                </select>
              </li>
            ))}
            {s.pages.length === 0 && <li style={{ color: "var(--ink-3)" }}>No pages yet.</li>}
          </ul>
        </section>
      ))}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn ghost" onClick={() => update((n) => { n.sections.push({ title: "New section", pages: [] }); })}>Add a section</button>
        {canSave && <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save the sidebar"}</button>}
      </div>
      {unlisted.length > 0 && (
        <section className="card nav-section">
          <h3 style={{ margin: "0 0 10px", font: "700 12px/1 var(--body)", textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--ink-3)" }}>Not in the sidebar</h3>
          <ul className="nav-pages">
            {unlisted.map((p) => (
              <li key={p}>
                <b>{titles[p]}</b><code>/{p}</code>
                <select aria-label="Add to section" value="" onChange={(e) => update((n) => { n.sections[Number(e.target.value)].pages.push(p); })}>
                  <option value="" disabled>Add to…</option>
                  {nav.sections.map((x, i) => <option key={i} value={i}>{x.title || "(untitled)"}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  );
}

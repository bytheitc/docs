"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/api";

interface Hit { href: string; title: string; where: string; snippet: string; score: number }

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function snippetOf(text: string, terms: string[]): string {
  const t = norm(text);
  const at = terms.map((x) => t.indexOf(x)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return text.slice(0, 140);
  const start = Math.max(0, at - 50);
  return (start ? "…" : "") + text.slice(start, start + 160).trim() + "…";
}

function search(entries: SearchEntry[], q: string): Hit[] {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: Hit[] = [];
  for (const e of entries) {
    const title = norm(e.title);
    const desc = norm(e.description);
    const body = norm(e.text);
    if (!terms.every((t) => title.includes(t) || desc.includes(t) || body.includes(t) || e.headings.some((h) => norm(h.text).includes(t)))) continue;
    const href = e.slug === "index" ? "/" : `/${e.slug}`;
    let score = 0;
    for (const t of terms) score += (title.includes(t) ? 10 : 0) + (title.startsWith(t) ? 5 : 0) + (desc.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0);
    hits.push({ href, title: e.title, where: e.section ?? "Docs", snippet: snippetOf(e.description || e.text, terms), score });
    // Sections whose heading matches are results of their own, linking straight to them.
    for (const h of e.headings) {
      const ht = norm(h.text);
      if (terms.every((t) => ht.includes(t) || title.includes(t))) {
        hits.push({ href: `${href}#${h.id}`, title: h.text, where: `${e.section ?? "Docs"} › ${e.title}`, snippet: "", score: score + (terms.every((t) => ht.includes(t)) ? 6 : 0) - 1 });
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 12);
}

function Highlight({ text, q }: { text: string; q: string }) {
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>;
}

export function Search() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const show = useCallback(() => {
    setOpen(true);
    if (!entries) fetch("/search.json").then((r) => r.json()).then((d: { entries: SearchEntry[] }) => setEntries(d.entries)).catch(() => setEntries([]));
  }, [entries]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
    else setQ("");
  }, [open]);

  const hits = useMemo(() => (entries ? search(entries, q) : []), [entries, q]);
  useEffect(() => setSel(0), [q]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    setOpen(false);
    router.push(h.href);
  };

  return (
    <>
      <button type="button" className="search-btn" onClick={show} aria-label="Search the docs">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span className="label">Search the docs</span>
        <kbd>⌘K</kbd>
      </button>
      {open && (
        <div className="search-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="search-box" role="dialog" aria-modal="true" aria-label="Search the docs">
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages and sections…"
              aria-controls="search-results"
              aria-activedescendant={hits[sel] ? `hit-${sel}` : undefined}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                else if (e.key === "Enter") go(hits[sel]);
              }}
            />
            {q.trim() && hits.length > 0 && (
              <ul id="search-results" className="search-results" role="listbox">
                {hits.map((h, i) => (
                  <li key={h.href + i}>
                    <a id={`hit-${i}`} href={h.href} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={(e) => { e.preventDefault(); go(h); }}>
                      <small>{h.where}</small>
                      <b><Highlight text={h.title} q={q} /></b>
                      {h.snippet && <span><Highlight text={h.snippet} q={q} /></span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {q.trim() && entries && hits.length === 0 && <p className="search-empty">Nothing matches “{q}”. Try fewer words.</p>}
            {!q.trim() && <p className="search-empty">{entries ? "Type to search every page." : "Loading…"}</p>}
            <div className="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>
          </div>
        </div>
      )}
    </>
  );
}

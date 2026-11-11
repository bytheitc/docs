"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LANGS as REPO_LANGS, type Lang, type Repo } from "@/lib/repos";

const LANGS: ("ALL" | Lang)[] = ["ALL", ...REPO_LANGS];

/** Searchable, filterable repo list. Receives the published repos from a server component. */
export function RepoIndex({ repos }: { repos: Repo[] }) {
  const [lang, setLang] = useState<(typeof LANGS)[number]>("ALL");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return repos.filter(
      (r) => (lang === "ALL" || r.lang === lang) && (!needle || r.name.includes(needle) || r.desc.toLowerCase().includes(needle)),
    );
  }, [repos, lang, q]);

  return (
    <div className="repo-index">
      <div className="repo-controls">
        <label className="search">
          <span>GREP&gt;</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search repos" aria-label="Search repositories" />
        </label>
        <div className="lang-filter" role="group" aria-label="Filter by language">
          {LANGS.map((l) => (
            <button key={l} aria-pressed={lang === l} className={lang === l ? "on" : undefined} onClick={() => setLang(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <ul className="repos">
        {shown.map((r) => (
          <li key={r.slug} className="repo">
            <Link href={`/projects/${r.slug}`} className="repo-link">
              <span className="repo-name">itc/{r.name}</span>
              <span className="repo-desc">{r.desc}</span>
              <span className="repo-meta">
                <span className={`lang lang-${r.lang.toLowerCase()}`}>{r.lang}</span>
                <span>{r.license}</span>
                <span>{r.house}</span>
                <span className="gfi">{r.issues.length} good first issues</span>
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && <li className="repo-empty">NO MATCH. MAYBE YOU SHOULD START IT? <Link href="/governance#rfcs">WRITE AN RFC →</Link></li>}
      </ul>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { PubEntry } from "@/components/PubEntry";
import { GROUP_NAMES, PUB_TYPES, type Group, type PubType, type Publication } from "@/lib/publications";

function matches(p: Publication, q: string): boolean {
  if (!q) return true;
  const hay = [p.id, p.title, p.summary, p.group, p.type, ...p.tags, ...p.keywords, ...p.abstract].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export function PubIndex({ publications: PUBLICATIONS, search = false }: { publications: Publication[]; search?: boolean }) {
  const [type, setType] = useState<PubType | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [q, setQ] = useState("");

  const shown = useMemo(
    () => PUBLICATIONS.filter((p) => (!type || p.type === type) && (!group || p.group === group) && matches(p, q.trim())),
    [PUBLICATIONS, type, group, q],
  );
  const count = (pred: (p: Publication) => boolean) => PUBLICATIONS.filter(pred).length;
  const active = type || group || q;

  return (
    <div className="index">
      <aside className="facets" aria-label="Filter publications">
        {search && (
          <div className="facet facet-search">
            <label className="facet-h" htmlFor="pub-q">Search</label>
            <input
              id="pub-q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Title, keyword, identifier" autoComplete="off" className="search"
            />
          </div>
        )}
        <div className="facet">
          <p className="facet-h">Type</p>
          <ul>
            {PUB_TYPES.map((t) => (
              <li key={t}>
                <button type="button" aria-pressed={type === t} className={type === t ? "on" : undefined} onClick={() => setType(type === t ? null : t)}>
                  <span>{t}</span><span className="n">{count((p) => p.type === t)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="facet">
          <p className="facet-h">Group</p>
          <ul>
            {GROUP_NAMES.map((g) => (
              <li key={g}>
                <button type="button" aria-pressed={group === g} className={group === g ? "on" : undefined} onClick={() => setGroup(group === g ? null : g)}>
                  <span>{g}</span><span className="n">{count((p) => p.group === g)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {active && (
          <button type="button" className="clear" onClick={() => { setType(null); setGroup(null); setQ(""); }}>Clear filters</button>
        )}
      </aside>

      <div>
        {search && <p className="result-count" aria-live="polite">{shown.length} of {PUBLICATIONS.length} entries</p>}
        <ol className="pubs">
          {shown.map((p) => <PubEntry key={p.id} p={p} />)}
          {shown.length === 0 && <li className="pub empty">No publications match these filters.</li>}
        </ol>
      </div>
    </div>
  );
}

// Stats from a list of hits. The memory store uses it directly; the Mongo store computes the same
// numbers in an aggregation, and the tests hold the two to each other.
import { DIMENSIONS, type Dimension, type Hit, type Row, type Stats } from "./types.js";

export const dayOf = (d: Date): string => d.toISOString().slice(0, 10);

/** Every UTC day from `from` to `to` inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`); t <= end && out.length < 1000; t += 864e5) out.push(dayOf(new Date(t)));
  return out;
}

/** Visitors = distinct (day, visitor) pairs; count = hits. Sorted by visitors, then count, then key. */
export function rank(groups: Map<string, { pairs: Set<string>; count: number }>, limit: number): Row[] {
  return [...groups.entries()]
    .map(([key, g]) => ({ key, visitors: g.pairs.size, count: g.count }))
    .sort((a, b) => b.visitors - a.visitors || b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function computeStats(hits: Hit[], from: string, to: string): Stats {
  const perDay = new Map(daysBetween(from, to).map((d) => [d, { visitors: new Set<string>(), pageviews: 0 }]));
  const dims = Object.fromEntries(DIMENSIONS.map((d) => [d, new Map<string, { pairs: Set<string>; count: number }>()])) as Record<Dimension, Map<string, { pairs: Set<string>; count: number }>>;
  const events = new Map<string, { pairs: Set<string>; count: number }>();
  const bump = (m: Map<string, { pairs: Set<string>; count: number }>, key: string, pair: string) => {
    const g = m.get(key) ?? { pairs: new Set<string>(), count: 0 };
    g.pairs.add(pair);
    g.count++;
    m.set(key, g);
  };

  for (const h of hits) {
    const day = perDay.get(h.day);
    if (!day) continue;
    const pair = `${h.day}|${h.visitor}`;
    if (h.name !== "pageview") { bump(events, h.name, pair); continue; }
    day.visitors.add(h.visitor);
    day.pageviews++;
    for (const d of DIMENSIONS) bump(dims[d], h[d], pair);
  }

  const days = [...perDay.entries()].map(([day, v]) => ({ day, visitors: v.visitors.size, pageviews: v.pageviews }));
  return {
    visitors: days.reduce((n, d) => n + d.visitors, 0),
    pageviews: days.reduce((n, d) => n + d.pageviews, 0),
    days,
    top: Object.fromEntries(DIMENSIONS.map((d) => [d, rank(dims[d], 10)])) as Record<Dimension, Row[]>,
    events: rank(events, 20),
  };
}

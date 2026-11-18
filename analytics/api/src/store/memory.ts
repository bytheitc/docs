// The same contract as mongo.ts, in memory. Used by the tests, and by `npm run dev` with no database.
import { randomBytes } from "node:crypto";
import { computeStats } from "./stats.js";
import type { AnalyticsStore, Hit, Site } from "./types.js";

export function createMemoryStore(): AnalyticsStore {
  const sites = new Map<string, Site>();
  const salts = new Map<string, string>();
  let hits: (Hit & { expireAt: number })[] = [];
  const live = () => {
    const now = Date.now();
    hits = hits.filter((h) => h.expireAt > now);
    return hits;
  };

  return {
    async close() {},
    async createSite(s) {
      if ([...sites.values()].some((x) => x.slug === s.slug || x.id === s.id)) return false;
      sites.set(s.id, { ...s, domains: [...s.domains] });
      return true;
    },
    async listSites() {
      return [...sites.values()].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ ...s }));
    },
    async getSite(id) {
      const s = sites.get(id);
      return s ? { ...s } : null;
    },
    async getSiteBySlug(slug) {
      const s = [...sites.values()].find((x) => x.slug === slug);
      return s ? { ...s } : null;
    },
    async updateDomains(id, domains) {
      const s = sites.get(id);
      if (!s) return null;
      s.domains = [...domains];
      return { ...s };
    },
    async salt(day) {
      let s = salts.get(day);
      if (!s) {
        s = randomBytes(32).toString("hex");
        salts.set(day, s);
        for (const k of salts.keys()) if (k < day && salts.size > 2) salts.delete(k);
      }
      return s;
    },
    async record(hit, retentionDays) {
      hits.push({ ...hit, expireAt: hit.ts.getTime() + retentionDays * 864e5 });
    },
    async stats(siteId, from, to) {
      return computeStats(live().filter((h) => h.site === siteId && h.day >= from && h.day <= to), from, to);
    },
    async live(siteId, since) {
      return new Set(live().filter((h) => h.site === siteId && h.name === "pageview" && h.ts >= since).map((h) => h.visitor)).size;
    },
  };
}

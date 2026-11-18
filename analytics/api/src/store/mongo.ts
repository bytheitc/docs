// MongoDB store. Page views are kept raw (with a TTL) and summed on read, in one aggregation per
// dashboard: at the collective's traffic that is cheaper to run than rollups are to keep right.
import { randomBytes } from "node:crypto";
import { MongoClient, type Collection, type Document } from "mongodb";
import { daysBetween } from "./stats.js";
import { DIMENSIONS, type AnalyticsStore, type Dimension, type Hit, type Row, type Site, type Stats } from "./types.js";

type HitDoc = Hit & { expireAt: Date };
type SaltDoc = { _id: string; salt: string; expireAt: Date };

/** Group by key, counting distinct (day, visitor) pairs and hits; top `limit`. */
const ranked = (key: string, limit: number): Document[] => [
  { $group: { _id: { k: key, d: "$day", v: "$visitor" }, n: { $sum: 1 } } },
  { $group: { _id: "$_id.k", visitors: { $sum: 1 }, count: { $sum: "$n" } } },
  { $sort: { visitors: -1, count: -1, _id: 1 } },
  { $limit: limit },
];

export function createMongoStore(uri: string, dbName: string): AnalyticsStore {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  let ready: Promise<{ sites: Collection<Site>; hits: Collection<HitDoc>; salts: Collection<SaltDoc> }> | undefined;

  const cols = () => {
    ready ??= (async () => {
      await client.connect();
      const db = client.db(dbName);
      const sites = db.collection<Site>("sites");
      const hits = db.collection<HitDoc>("hits");
      const salts = db.collection<SaltDoc>("salts");
      await Promise.all([
        sites.createIndex({ id: 1 }, { unique: true }),
        sites.createIndex({ slug: 1 }, { unique: true }),
        hits.createIndex({ site: 1, day: 1 }),
        hits.createIndex({ site: 1, ts: -1 }),
        hits.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
        salts.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("_meta").updateOne({ _id: "about" as never }, { $set: { purpose: "analytics/api: sites, anonymous page views (no IPs, no cookies) and daily salts." } }, { upsert: true }),
      ]).catch((e) => {
        ready = undefined;
        throw e;
      });
      return { sites, hits, salts };
    })();
    return ready;
  };

  return {
    async close() {
      await client.close();
    },
    async createSite(s) {
      const { sites } = await cols();
      try {
        await sites.insertOne({ ...s });
        return true;
      } catch (e) {
        if ((e as { code?: number }).code === 11000) return false;
        throw e;
      }
    },
    async listSites() {
      const { sites } = await cols();
      return (await sites.find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray()) as Site[];
    },
    async getSite(id) {
      const { sites } = await cols();
      return sites.findOne({ id }, { projection: { _id: 0 } });
    },
    async getSiteBySlug(slug) {
      const { sites } = await cols();
      return sites.findOne({ slug }, { projection: { _id: 0 } });
    },
    async updateDomains(id, domains) {
      const { sites } = await cols();
      return sites.findOneAndUpdate({ id }, { $set: { domains } }, { returnDocument: "after", projection: { _id: 0 } });
    },

    async salt(day) {
      const { salts } = await cols();
      // Every instance gets the same salt: the first to ask creates it, the rest read it. It deletes
      // itself two days on, after which that day's visitor hashes can't be recomputed by anyone.
      const expireAt = new Date(Date.parse(`${day}T00:00:00Z`) + 2 * 864e5);
      for (let attempt = 0; ; attempt++) {
        try {
          const doc = await salts.findOneAndUpdate(
            { _id: day },
            { $setOnInsert: { salt: randomBytes(32).toString("hex"), expireAt } },
            { upsert: true, returnDocument: "after" },
          );
          return doc!.salt;
        } catch (e) {
          // Two instances upserting the same day at once: one wins, the other reads it next time round.
          if ((e as { code?: number }).code !== 11000 || attempt > 2) throw e;
        }
      }
    },

    async record(hit, retentionDays) {
      const { hits } = await cols();
      await hits.insertOne({ ...hit, expireAt: new Date(hit.ts.getTime() + retentionDays * 864e5) });
    },

    async stats(siteId, from, to): Promise<Stats> {
      const { hits } = await cols();
      const pv = { $match: { name: "pageview" } };
      const facets: Record<string, Document[]> = {
        days: [
          pv,
          { $group: { _id: { d: "$day", v: "$visitor" }, n: { $sum: 1 } } },
          { $group: { _id: "$_id.d", visitors: { $sum: 1 }, pageviews: { $sum: "$n" } } },
        ],
        events: [{ $match: { name: { $ne: "pageview" } } }, ...ranked("$name", 20)],
      };
      for (const d of DIMENSIONS) facets[d] = [pv, ...ranked(`$${d}`, 10)];

      const [out] = await hits.aggregate<Record<string, Document[]>>([
        { $match: { site: siteId, day: { $gte: from, $lte: to } } },
        { $facet: facets },
      ]).toArray();

      const byDay = new Map((out?.days ?? []).map((r) => [r._id as string, r]));
      const days = daysBetween(from, to).map((day) => ({ day, visitors: byDay.get(day)?.visitors ?? 0, pageviews: byDay.get(day)?.pageviews ?? 0 }));
      const rows = (docs: Document[] | undefined): Row[] => (docs ?? []).map((r) => ({ key: String(r._id ?? ""), visitors: r.visitors, count: r.count }));
      return {
        visitors: days.reduce((n, d) => n + d.visitors, 0),
        pageviews: days.reduce((n, d) => n + d.pageviews, 0),
        days,
        top: Object.fromEntries(DIMENSIONS.map((d) => [d, rows(out?.[d])])) as Record<Dimension, Row[]>,
        events: rows(out?.events),
      };
    },

    async live(siteId, since) {
      const { hits } = await cols();
      return (await hits.distinct("visitor", { site: siteId, name: "pageview", ts: { $gte: since } })).length;
    },
  };
}

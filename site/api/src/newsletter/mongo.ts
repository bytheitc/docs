// MongoDB implementation of NewsletterStore, in this house's own database (itc_site).
// Only site/api connects to it (ARCHITECTURE.md, rule 2).
import { MongoClient, type Db } from "mongodb";
import type { ListId, NewsletterStore, Subscriber } from "./types.js";

const COLLECTION = "newsletter_subscribers";

const g = globalThis as unknown as { __itcSiteMongo?: Map<string, Promise<MongoClient>> };
g.__itcSiteMongo ??= new Map();
function client(uri: string): Promise<MongoClient> {
  let p = g.__itcSiteMongo!.get(uri);
  if (!p) {
    p = new MongoClient(uri, { appName: "itc-site-api", maxPoolSize: 5 }).connect();
    p.catch(() => g.__itcSiteMongo!.delete(uri));
    g.__itcSiteMongo!.set(uri, p);
  }
  return p;
}

function strip(doc: unknown): Subscriber | null {
  if (!doc) return null;
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as unknown as Subscriber;
}

export function createNewsletterMongoStore(uri: string, dbName: string): NewsletterStore {
  let ready: Promise<Db> | null = null;
  const db = (): Promise<Db> => {
    ready ??= (async () => {
      const d = (await client(uri)).db(dbName);
      await Promise.all([
        d.collection(COLLECTION).createIndex({ email: 1 }, { unique: true }),
        d.collection(COLLECTION).createIndex({ confirmTokenHash: 1 }, { sparse: true }),
        d.collection(COLLECTION).createIndex({ unsubscribeTokenHash: 1 }, { unique: true }),
        d.collection(COLLECTION).createIndex({ status: 1, lists: 1 }),
      ]);
      return d;
    })();
    return ready;
  };
  const col = async () => (await db()).collection<Subscriber>(COLLECTION);

  return {
    kind: "mongodb",
    async ping() {
      await (await db()).command({ ping: 1 });
    },
    async close() {
      // The client is shared per process; closing it here would break other callers.
    },

    async get(email) {
      return strip(await (await col()).findOne({ email }));
    },
    async put(sub) {
      await (await col()).updateOne({ email: sub.email }, { $set: sub }, { upsert: true });
    },
    async patch(email, patch) {
      const unset: Record<string, ""> = {};
      const set: Record<string, unknown> = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) unset[k] = "";
        else set[k] = v;
      }
      await (await col()).updateOne({ email }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    },
    async byConfirmTokenHash(hash) {
      return strip(await (await col()).findOne({ confirmTokenHash: hash }));
    },
    async byUnsubscribeTokenHash(hash) {
      return strip(await (await col()).findOne({ unsubscribeTokenHash: hash }));
    },
    async listConfirmed(list?: ListId) {
      const q = list ? { status: "confirmed" as const, lists: list } : { status: "confirmed" as const };
      return (await (await col()).find(q).sort({ confirmedAt: 1 }).toArray()).map((d) => strip(d)!);
    },
    async counts() {
      const c = await col();
      const [pending, confirmed, unsubscribed] = await Promise.all([
        c.countDocuments({ status: "pending" }),
        c.countDocuments({ status: "confirmed" }),
        c.countDocuments({ status: "unsubscribed" }),
      ]);
      return { pending, confirmed, unsubscribed };
    },
  };
}

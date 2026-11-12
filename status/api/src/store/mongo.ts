// This service's own database. It must not be the database of anything it watches.
import { MongoClient, type Db } from "mongodb";
import type {
  CheckResult, DayBucket, Incident, Service, StatusStore, Subscriber, Tenant,
} from "../types.js";
import { dayOf } from "../util.js";

let client: MongoClient | null = null;
const connect = async (uri: string) => (client ??= await new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect());

/** Mongo hands dates back as Dates, but a stored document read through a generic type is not typed
 *  that way; this keeps the rest of the code from having to care. */
function dates(s: Subscriber): Subscriber {
  return {
    ...s,
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt),
    ...(s.confirmExpiresAt ? { confirmExpiresAt: new Date(s.confirmExpiresAt) } : {}),
    ...(s.confirmedAt ? { confirmedAt: new Date(s.confirmedAt) } : {}),
    ...(s.unsubscribedAt ? { unsubscribedAt: new Date(s.unsubscribedAt) } : {}),
    ...(s.lastConfirmSentAt ? { lastConfirmSentAt: new Date(s.lastConfirmSentAt) } : {}),
  };
}

function strip<T>(doc: unknown): T {
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as T;
}

export function createMongoStore(uri: string, dbName: string): StatusStore {
  let ready: Promise<Db> | null = null;
  const db = (): Promise<Db> => {
    ready ??= (async () => {
      const d = (await connect(uri)).db(dbName);
      await Promise.all([
        d.collection("status_tenants").createIndex({ id: 1 }, { unique: true }),
        d.collection("status_tenants").createIndex({ hosts: 1 }),
        d.collection("status_services").createIndex({ id: 1 }, { unique: true }),
        d.collection("status_services").createIndex({ tenantId: 1, order: 1 }),
        d.collection("status_results").createIndex({ serviceId: 1, at: -1 }),
        d.collection("status_results").createIndex({ tenantId: 1, at: -1 }),
        d.collection("status_buckets").createIndex({ serviceId: 1, day: 1 }, { unique: true }),
        d.collection("status_buckets").createIndex({ tenantId: 1, day: 1 }),
        d.collection("status_subscribers").createIndex({ tenantId: 1, email: 1 }, { unique: true }),
        d.collection("status_subscribers").createIndex({ id: 1 }, { unique: true }),
        d.collection("status_subscribers").createIndex({ confirmTokenHash: 1 }),
        d.collection("status_subscribers").createIndex({ tenantId: 1, status: 1 }),
        d.collection("status_incidents").createIndex({ id: 1 }, { unique: true }),
        d.collection("status_incidents").createIndex({ tenantId: 1, startedAt: -1 }),
      ]);
      return d;
    })();
    return ready;
  };
  const col = async <T extends object>(name: string) => (await db()).collection<T>(name);

  return {
    kind: "mongodb",
    async close() {
      await client?.close();
      client = null;
      ready = null;
    },

    async getTenant(id) {
      const d = await (await col<Tenant>("status_tenants")).findOne({ id });
      return d ? strip<Tenant>(d) : null;
    },
    async getTenantByHost(host) {
      const d = await (await col<Tenant>("status_tenants")).findOne({ hosts: host, disabled: { $ne: true } });
      return d ? strip<Tenant>(d) : null;
    },
    async listTenants() {
      return (await (await col<Tenant>("status_tenants")).find({}).sort({ createdAt: 1 }).limit(500).toArray()).map((d) => strip<Tenant>(d));
    },
    async addTenant(t) { await (await col<Tenant>("status_tenants")).insertOne({ ...t }); },
    async updateTenant(id, patch) { await (await col<Tenant>("status_tenants")).updateOne({ id }, { $set: patch }); },

    async listServices(tenantId) {
      return (await (await col<Service>("status_services")).find({ tenantId }).sort({ order: 1 }).limit(500).toArray()).map((d) => strip<Service>(d));
    },
    async listAllServices() {
      return (await (await col<Service>("status_services")).find({}).limit(5000).toArray()).map((d) => strip<Service>(d));
    },
    async getService(id) {
      const d = await (await col<Service>("status_services")).findOne({ id });
      return d ? strip<Service>(d) : null;
    },
    async addService(s) { await (await col<Service>("status_services")).insertOne({ ...s }); },
    async updateService(id, patch) { await (await col<Service>("status_services")).updateOne({ id }, { $set: patch }); },
    async deleteService(id) {
      const d = await db();
      await Promise.all([
        d.collection("status_services").deleteOne({ id }),
        d.collection("status_results").deleteMany({ serviceId: id }),
        d.collection("status_buckets").deleteMany({ serviceId: id }),
      ]);
    },

    async recordResult(r) {
      const d = await db();
      const day = dayOf(r.at);
      await Promise.all([
        d.collection("status_results").insertOne({ ...r }),
        // The bucket is the durable history: probes are pruned, these are not.
        d.collection("status_buckets").updateOne(
          { serviceId: r.serviceId, day },
          {
            $setOnInsert: { serviceId: r.serviceId, tenantId: r.tenantId, day },
            $inc: {
              total: 1,
              down: r.state === "down" ? 1 : 0,
              degraded: r.state === "degraded" ? 1 : 0,
              msSum: r.ms,
              msCount: 1,
            },
          },
          { upsert: true },
        ),
      ]);
    },

    async latestResults(tenantId) {
      const rows = await (await col<CheckResult>("status_results"))
        .aggregate([
          { $match: { tenantId } },
          { $sort: { at: -1 } },
          { $group: { _id: "$serviceId", doc: { $first: "$$ROOT" } } },
        ])
        .toArray();
      const out: Record<string, CheckResult> = {};
      for (const row of rows) {
        const r = strip<CheckResult>((row as { doc: unknown }).doc);
        out[r.serviceId] = { ...r, at: new Date(r.at) };
      }
      return out;
    },

    async buckets(tenantId, sinceDay) {
      return (await (await col<DayBucket>("status_buckets")).find({ tenantId, day: { $gte: sinceDay } }).limit(20_000).toArray())
        .map((d) => strip<DayBucket>(d));
    },

    async prune(before) {
      const r = await (await col<CheckResult>("status_results")).deleteMany({ at: { $lt: before } });
      return r.deletedCount ?? 0;
    },

    /* ---------------- subscribers ---------------- */

    async getSubscriber(tenantId, email) {
      const d = await (await col<Subscriber>("status_subscribers")).findOne({ tenantId, email });
      return d ? dates(strip<Subscriber>(d)) : null;
    },
    async putSubscriber(sub) {
      await (await col<Subscriber>("status_subscribers")).updateOne(
        { tenantId: sub.tenantId, email: sub.email },
        { $set: { ...sub } },
        { upsert: true },
      );
    },
    async patchSubscriber(tenantId, email, patch) {
      await (await col<Subscriber>("status_subscribers")).updateOne({ tenantId, email }, { $set: patch });
    },
    async subscriberById(id) {
      if (!id) return null;
      const d = await (await col<Subscriber>("status_subscribers")).findOne({ id });
      return d ? dates(strip<Subscriber>(d)) : null;
    },
    async subscriberByConfirmHash(hash) {
      if (!hash) return null;
      const d = await (await col<Subscriber>("status_subscribers")).findOne({ confirmTokenHash: hash });
      return d ? dates(strip<Subscriber>(d)) : null;
    },
    async listConfirmedSubscribers(tenantId) {
      return (await (await col<Subscriber>("status_subscribers")).find({ tenantId, status: "confirmed" }).limit(50_000).toArray())
        .map((d) => dates(strip<Subscriber>(d)));
    },
    async subscriberCounts(tenantId) {
      const c = await col<Subscriber>("status_subscribers");
      const [pending, confirmed, unsubscribed] = await Promise.all([
        c.countDocuments({ tenantId, status: "pending" }),
        c.countDocuments({ tenantId, status: "confirmed" }),
        c.countDocuments({ tenantId, status: "unsubscribed" }),
      ]);
      return { pending, confirmed, unsubscribed };
    },

    async listIncidents(tenantId, opts) {
      const q: Record<string, unknown> = { tenantId };
      if (opts?.openOnly) q.status = { $ne: "resolved" };
      const rows = await (await col<Incident>("status_incidents"))
        .find(q).sort({ startedAt: -1 }).limit(opts?.limit ?? 50).toArray();
      return rows.map((d) => {
        const i = strip<Incident>(d);
        return {
          ...i,
          startedAt: new Date(i.startedAt),
          resolvedAt: i.resolvedAt ? new Date(i.resolvedAt) : undefined,
          updates: i.updates.map((u) => ({ ...u, at: new Date(u.at) })),
        };
      });
    },
    async getIncident(id) {
      const d = await (await col<Incident>("status_incidents")).findOne({ id });
      if (!d) return null;
      const i = strip<Incident>(d);
      return {
        ...i,
        startedAt: new Date(i.startedAt),
        resolvedAt: i.resolvedAt ? new Date(i.resolvedAt) : undefined,
        updates: i.updates.map((u) => ({ ...u, at: new Date(u.at) })),
      };
    },
    async addIncident(i) { await (await col<Incident>("status_incidents")).insertOne({ ...i }); },
    async updateIncident(id, patch) { await (await col<Incident>("status_incidents")).updateOne({ id }, { $set: patch }); },
  };
}

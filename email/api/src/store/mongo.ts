// MongoDB implementation of EmailStore, against this service's own database (itc_email).
// Only this api connects to it (ARCHITECTURE.md, rule 2).
import { MongoClient, type Db } from "mongodb";
import type {
  Campaign, CampaignStats, Contact, ContactStatus, EmailList, EmailStore, SendRecord, Suppression, Template, TransactionalRecord,
} from "./types.js";

// One connection pool per URI, per process.
const g = globalThis as unknown as { __itcMongo?: Map<string, Promise<MongoClient>> };
g.__itcMongo ??= new Map();
function client(uri: string): Promise<MongoClient> {
  let p = g.__itcMongo!.get(uri);
  if (!p) {
    p = new MongoClient(uri, { appName: "itc-email-api", maxPoolSize: 10 }).connect();
    p.catch(() => g.__itcMongo!.delete(uri));
    g.__itcMongo!.set(uri, p);
  }
  return p;
}

function strip<T>(doc: unknown): T {
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as T;
}

export function createEmailMongoStore(uri: string, dbName: string): EmailStore {
  let ready: Promise<Db> | null = null;
  const db = (): Promise<Db> => {
    ready ??= (async () => {
      const d = (await client(uri)).db(dbName);
      await Promise.all([
        d.collection("email_lists").createIndex({ id: 1 }, { unique: true }),
        d.collection("email_contacts").createIndex({ id: 1 }, { unique: true }),
        d.collection("email_contacts").createIndex({ listId: 1, email: 1 }, { unique: true }),
        d.collection("email_contacts").createIndex({ unsubscribeToken: 1 }, { unique: true }),
        // Suppressed everywhere, regardless of which list they came in on.
        d.collection("email_suppressions").createIndex({ email: 1 }, { unique: true }),
        d.collection("email_templates").createIndex({ id: 1 }, { unique: true }),
        d.collection("email_campaigns").createIndex({ id: 1 }, { unique: true }),
        d.collection("email_contacts").createIndex({ email: 1 }),
        d.collection("email_campaigns").createIndex({ status: 1, leaseUntil: 1 }),
        d.collection("email_sends").createIndex({ campaignId: 1, at: -1 }),
        // One record per recipient per campaign: the lock that prevents a double send.
        d.collection("email_sends").createIndex({ campaignId: 1, contactId: 1 }, { unique: true }),
        d.collection("email_transactional").createIndex({ at: -1 }),
      ]);
      return d;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  };
  const col = async (name: string) => (await db()).collection(name);

  return {
    /* ---------------- lists ---------------- */

    async createList(l) {
      const now = new Date();
      const doc: EmailList = { ...l, contactCount: 0, createdAt: now, updatedAt: now };
      await (await col("email_lists")).insertOne({ ...doc });
      return doc;
    },
    async listLists() {
      return ((await (await col("email_lists")).find({}).sort({ createdAt: -1 }).toArray()) as unknown[]).map((d) => strip<EmailList>(d));
    },
    async getList(id) {
      const doc = await (await col("email_lists")).findOne({ id });
      return doc ? strip<EmailList>(doc) : null;
    },
    async deleteList(id) {
      await (await col("email_lists")).deleteOne({ id });
      await (await col("email_contacts")).deleteMany({ listId: id });
    },
    async bumpListFields(id, fieldNames) {
      await (await col("email_lists")).updateOne({ id }, { $addToSet: { fieldNames: { $each: fieldNames } }, $set: { updatedAt: new Date() } });
    },

    /* ---------------- contacts ---------------- */

    async insertContacts(contacts) {
      if (!contacts.length) return { inserted: 0, skipped: 0 };
      const now = new Date();
      const c = await col("email_contacts");
      let inserted = 0;
      try {
        const res = await c.insertMany(contacts.map((x) => ({ ...x, createdAt: now })), { ordered: false });
        inserted = res.insertedCount;
      } catch (e) {
        // E11000 on duplicate (listId, email) pairs: count what landed, skip the rest.
        const anyErr = e as { result?: { insertedCount?: number } };
        inserted = anyErr.result?.insertedCount ?? 0;
      }
      if (inserted) await (await col("email_lists")).updateOne({ id: contacts[0].listId }, { $inc: { contactCount: inserted }, $set: { updatedAt: now } });
      return { inserted, skipped: contacts.length - inserted };
    },
    async listContacts(listId, { limit, offset }) {
      const c = await col("email_contacts");
      const [contacts, total] = await Promise.all([
        c.find({ listId }).sort({ createdAt: 1 }).skip(offset).limit(limit).toArray(),
        c.countDocuments({ listId }),
      ]);
      return { contacts: contacts.map((d) => strip<Contact>(d)), total };
    },
    async getContactByToken(token) {
      const doc = await (await col("email_contacts")).findOne({ unsubscribeToken: token });
      return doc ? strip<Contact>(doc) : null;
    },
    async setContactStatus(id, status: ContactStatus) {
      await (await col("email_contacts")).updateOne({ id }, { $set: { status } });
    },
    async setStatusForEmail(email, status: ContactStatus) {
      const res = await (await col("email_contacts")).updateMany({ email: email.toLowerCase() }, { $set: { status } });
      return res.modifiedCount;
    },

    /* ---------------- suppressions ---------------- */

    async isSuppressed(email) {
      return Boolean(await (await col("email_suppressions")).findOne({ email: email.toLowerCase() }));
    },
    async getSuppression(email) {
      const doc = await (await col("email_suppressions")).findOne({ email: email.toLowerCase() });
      return doc ? strip<Suppression>(doc) : null;
    },
    async addSuppression(s: Suppression) {
      const email = s.email.toLowerCase();
      await (await col("email_suppressions")).updateOne({ email }, { $set: { ...s, email } }, { upsert: true });
    },

    /* ---------------- templates ---------------- */

    async createTemplate(t) {
      const now = new Date();
      const doc: Template = { ...t, createdAt: now, updatedAt: now };
      await (await col("email_templates")).insertOne({ ...doc });
      return doc;
    },
    async listTemplates() {
      return ((await (await col("email_templates")).find({}).sort({ updatedAt: -1 }).toArray()) as unknown[]).map((d) => strip<Template>(d));
    },
    async getTemplate(id) {
      const doc = await (await col("email_templates")).findOne({ id });
      return doc ? strip<Template>(doc) : null;
    },
    async updateTemplate(id, patch) {
      const res = await (await col("email_templates")).findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
      return res ? strip<Template>(res) : null;
    },
    async deleteTemplate(id) {
      await (await col("email_templates")).deleteOne({ id });
    },

    /* ---------------- campaigns ---------------- */

    async createCampaign(c) {
      const doc: Campaign = { ...c, status: "draft", stats: { total: 0, sent: 0, failed: 0, skipped: 0 }, createdAt: new Date() };
      await (await col("email_campaigns")).insertOne({ ...doc });
      return doc;
    },
    async listCampaigns() {
      return ((await (await col("email_campaigns")).find({}).sort({ createdAt: -1 }).toArray()) as unknown[]).map((d) => strip<Campaign>(d));
    },
    async getCampaign(id) {
      const doc = await (await col("email_campaigns")).findOne({ id });
      return doc ? strip<Campaign>(doc) : null;
    },
    async deleteCampaign(id) {
      await (await col("email_campaigns")).deleteOne({ id });
      await (await col("email_sends")).deleteMany({ campaignId: id });
    },
    async claimCampaignForSending(id, { total, leaseUntil, sentBy }) {
      const res = await (await col("email_campaigns")).findOneAndUpdate(
        { id, status: "draft" },
        { $set: { status: "sending", startedAt: new Date(), leaseUntil, sentBy, stats: { total, sent: 0, failed: 0, skipped: 0 } } },
        { returnDocument: "after" },
      );
      return res ? strip<Campaign>(res) : null;
    },
    async takeOverInterruptedCampaign(id, leaseUntil) {
      const now = new Date();
      const res = await (await col("email_campaigns")).findOneAndUpdate(
        { id, status: "sending", $or: [{ leaseUntil: { $lt: now } }, { leaseUntil: { $exists: false } }] },
        { $set: { leaseUntil } },
        { returnDocument: "after" },
      );
      return res ? strip<Campaign>(res) : null;
    },
    async listInterruptedCampaigns() {
      const now = new Date();
      const docs = await (await col("email_campaigns"))
        .find({ status: "sending", $or: [{ leaseUntil: { $lt: now } }, { leaseUntil: { $exists: false } }] })
        .toArray();
      return (docs as unknown[]).map((d) => strip<Campaign>(d));
    },
    async renewCampaignLease(id, leaseUntil) {
      await (await col("email_campaigns")).updateOne({ id, status: "sending" }, { $set: { leaseUntil } });
    },
    async bumpCampaignStats(id, delta: Partial<CampaignStats>) {
      const inc: Record<string, number> = {};
      for (const [k, v] of Object.entries(delta)) if (typeof v === "number") inc[`stats.${k}`] = v;
      if (Object.keys(inc).length) await (await col("email_campaigns")).updateOne({ id }, { $inc: inc });
    },
    async finishCampaign(id, status) {
      await (await col("email_campaigns")).updateOne({ id }, { $set: { status, finishedAt: new Date() }, $unset: { leaseUntil: "" } });
    },

    /* ---------------- sends ---------------- */

    async beginSend(s) {
      try {
        await (await col("email_sends")).insertOne({ ...s, at: new Date() });
        return true;
      } catch (e) {
        if ((e as { code?: number }).code === 11000) return false;
        throw e;
      }
    },
    async completeSend(campaignId, contactId, outcome) {
      await (await col("email_sends")).updateOne(
        { campaignId, contactId, status: "pending" },
        { $set: { ...outcome, at: new Date() } },
      );
    },
    async closeOrphanedSends(campaignId) {
      const res = await (await col("email_sends")).updateMany(
        { campaignId, status: "pending" },
        { $set: { status: "failed", error: "Interrupted mid-send: delivery unknown, not retried.", at: new Date() } },
      );
      return res.modifiedCount;
    },
    async listSends(campaignId, limit = 200) {
      return ((await (await col("email_sends")).find({ campaignId }).sort({ at: -1 }).limit(limit).toArray()) as unknown[]).map((d) => strip<SendRecord>(d));
    },

    /* ---------------- transactional ---------------- */

    async addTransactional(t) {
      await (await col("email_transactional")).insertOne({ ...t, at: new Date() });
    },
    async listTransactional(limit = 100) {
      return ((await (await col("email_transactional")).find({}).sort({ at: -1 }).limit(limit).toArray()) as unknown[]).map((d) => strip<TransactionalRecord>(d));
    },
  };
}

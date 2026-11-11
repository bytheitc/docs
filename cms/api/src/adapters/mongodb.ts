// MongoDB storage adapter for the ITC CMS service.
import { MongoClient, MongoServerError } from "mongodb";
import {
  DuplicateEmailError, DuplicateIdError,
  type AuditEvent, type Entry, type Revision, type Session, type SpaceRecord, type StorageAdapter,
  type Submission, type User,
} from "../types.js";

type WithMongoId<T> = T & { _id?: unknown };

const strip = <T,>(doc: WithMongoId<T> | null): T | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc as WithMongoId<T> & Record<string, unknown>;
  void _id;
  return rest as T;
};
const stripAll = <T,>(docs: WithMongoId<T>[]): T[] => docs.map((d) => strip<T>(d)!);

const isDup = (e: unknown) => e instanceof MongoServerError && e.code === 11000;

export function createMongoAdapter(uri: string, dbName: string): StorageAdapter {
  const client = new MongoClient(uri, { appName: "itc-cms-api", maxPoolSize: 20, serverSelectionTimeoutMS: 5000 });
  let ready: Promise<ReturnType<MongoClient["db"]>> | null = null;

  const db = () => {
    ready ??= (async () => {
      await client.connect();
      const d = client.db(dbName);
      await Promise.all([
        d.collection("cms_spaces").createIndex({ id: 1 }, { unique: true }),
        d.collection("cms_entries").createIndex({ space: 1, collection: 1, id: 1 }, { unique: true }),
        d.collection("cms_entries").createIndex({ space: 1, collection: 1, status: 1, position: 1 }),
        d.collection("cms_revisions").createIndex({ space: 1, collection: 1, entryId: 1, at: -1 }),
        d.collection("cms_users").createIndex({ email: 1 }, { unique: true }),
        d.collection("cms_users").createIndex({ id: 1 }, { unique: true }),
        d.collection("cms_sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        // Mongo removes expired sessions on its own.
        d.collection("cms_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        d.collection("cms_submissions").createIndex({ id: 1 }, { unique: true }),
        d.collection("cms_submissions").createIndex({ space: 1, status: 1, createdAt: -1 }),
        d.collection("cms_audit").createIndex({ at: -1 }),
        d.collection("cms_audit").createIndex({ space: 1, at: -1 }),
      ]);
      return d;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  };

  const col = async <T extends object>(name: string) => (await db()).collection<T>(name);

  return {
    kind: "mongodb",

    async ping() {
      await (await db()).command({ ping: 1 });
    },
    async close() {
      await client.close();
    },

    async listSpaces() {
      return stripAll(await (await col<SpaceRecord>("cms_spaces")).find({}).sort({ id: 1 }).toArray());
    },
    async getSpace(id) {
      return strip(await (await col<SpaceRecord>("cms_spaces")).findOne({ id }));
    },
    async putSpace(space) {
      await (await col<SpaceRecord>("cms_spaces")).replaceOne({ id: space.id }, { ...space }, { upsert: true });
    },

    async listEntries(space, collection, opts) {
      const filter: Record<string, unknown> = { space, collection };
      if (opts?.status) filter.status = { $in: opts.status };
      const c = await col<Entry>("cms_entries");
      return stripAll(await c.find(filter).sort({ position: 1, createdAt: 1 }).toArray());
    },
    async getEntry(space, collection, id) {
      return strip(await (await col<Entry>("cms_entries")).findOne({ space, collection, id }));
    },
    async countEntries(space, collection) {
      return (await col<Entry>("cms_entries")).countDocuments({ space, collection });
    },
    async maxPosition(space, collection) {
      const top = await (await col<Entry>("cms_entries")).find({ space, collection }).sort({ position: -1 }).limit(1).toArray();
      return top[0]?.position ?? -1;
    },
    async createEntry(entry) {
      try {
        await (await col<Entry>("cms_entries")).insertOne({ ...entry });
      } catch (e) {
        if (isDup(e)) throw new DuplicateIdError(entry.collection, entry.id);
        throw e;
      }
    },
    async updateEntry(space, collection, id, patch) {
      const { newId, ...rest } = patch;
      const set: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (newId && newId !== id) set.id = newId;
      try {
        await (await col<Entry>("cms_entries")).updateOne({ space, collection, id }, { $set: set });
      } catch (e) {
        if (isDup(e)) throw new DuplicateIdError(collection, newId ?? id);
        throw e;
      }
      if (newId && newId !== id) {
        await (await col<Revision>("cms_revisions")).updateMany({ space, collection, entryId: id }, { $set: { entryId: newId } });
      }
    },
    async deleteEntry(space, collection, id) {
      await (await col<Entry>("cms_entries")).deleteOne({ space, collection, id });
    },
    async seedIfEmpty(space, collection, entries) {
      if (!entries.length) return false;
      const c = await col<Entry>("cms_entries");
      if ((await c.countDocuments({ space, collection }, { limit: 1 })) > 0) return false;
      try {
        // ordered:false + the unique index make concurrent seeding (two api instances booting) harmless.
        await c.insertMany(entries.map((e) => ({ ...e })), { ordered: false });
      } catch (e) {
        if (!(e instanceof MongoServerError) || !String(e.message).includes("E11000")) throw e;
      }
      return true;
    },

    async addRevision(rev) {
      await (await col<Revision>("cms_revisions")).insertOne({ ...rev });
    },
    async listRevisions(space, collection, entryId, limit = 20) {
      return stripAll(await (await col<Revision>("cms_revisions")).find({ space, collection, entryId }).sort({ at: -1 }).limit(limit).toArray());
    },

    async countUsers() {
      return (await col<User>("cms_users")).countDocuments({});
    },
    async listUsers() {
      return stripAll(await (await col<User>("cms_users")).find({}).sort({ createdAt: 1 }).toArray());
    },
    async getUserById(id) {
      return strip(await (await col<User>("cms_users")).findOne({ id }));
    },
    async getUserByEmail(email) {
      return strip(await (await col<User>("cms_users")).findOne({ email }));
    },
    async createUser(user) {
      try {
        await (await col<User>("cms_users")).insertOne({ ...user });
      } catch (e) {
        if (isDup(e)) throw new DuplicateEmailError(user.email);
        throw e;
      }
    },
    async updateUser(id, patch) {
      await (await col<User>("cms_users")).updateOne({ id }, { $set: patch });
    },
    async createSession(session) {
      await (await col<Session>("cms_sessions")).insertOne({ ...session });
    },
    async getSession(tokenHash) {
      const s = strip(await (await col<Session>("cms_sessions")).findOne({ tokenHash }));
      return s && s.expiresAt > new Date() ? s : null;
    },
    async deleteSession(tokenHash) {
      await (await col<Session>("cms_sessions")).deleteOne({ tokenHash });
    },
    async deleteUserSessions(userId) {
      await (await col<Session>("cms_sessions")).deleteMany({ userId });
    },

    async addSubmission(sub) {
      await (await col<Submission>("cms_submissions")).insertOne({ ...sub });
    },
    async listSubmissions(space, opts) {
      const filter: Record<string, unknown> = { space };
      if (opts?.form) filter.form = opts.form;
      if (opts?.status) filter.status = opts.status;
      return stripAll(await (await col<Submission>("cms_submissions")).find(filter).sort({ createdAt: -1 }).limit(500).toArray());
    },
    async getSubmission(space, id) {
      return strip(await (await col<Submission>("cms_submissions")).findOne({ space, id }));
    },
    async updateSubmission(space, id, patch) {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.status) set.status = patch.status;
      const update: Record<string, unknown> = { $set: set };
      if ("note" in patch) {
        if (patch.note) set.note = patch.note;
        else update.$unset = { note: "" };
      }
      await (await col<Submission>("cms_submissions")).updateOne({ space, id }, update);
    },
    async countSubmissions(space, opts) {
      const filter: Record<string, unknown> = { space };
      if (opts?.status) filter.status = opts.status;
      return (await col<Submission>("cms_submissions")).countDocuments(filter);
    },

    async addAudit(ev: AuditEvent) {
      await (await col<AuditEvent>("cms_audit")).insertOne({ ...ev });
    },
    async listAudit(opts) {
      const filter: Record<string, unknown> = {};
      if (opts?.space) filter.space = opts.space;
      const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 1000);
      return stripAll(await (await col<AuditEvent>("cms_audit")).find(filter).sort({ at: -1 }).limit(limit).toArray());
    },
  } satisfies StorageAdapter;
}

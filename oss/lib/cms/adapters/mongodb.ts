// MongoDB storage adapter for the ITC native CMS.
import { MongoClient, MongoServerError, type Db } from "mongodb";
import {
  DuplicateIdError,
  type AuditEvent, type Entry, type Revision, type Session, type Status, type StorageAdapter,
  type Submission, type SubmissionStatus, type User,
} from "@/lib/cms/types";

type WithoutMongoId<T> = T & { _id?: unknown };

// One client per process; survives dev hot reloads.
const g = globalThis as unknown as { __itcMongo?: Map<string, Promise<MongoClient>> };
g.__itcMongo ??= new Map();

function client(uri: string): Promise<MongoClient> {
  let p = g.__itcMongo!.get(uri);
  if (!p) {
    p = new MongoClient(uri, { appName: "itc-cms", maxPoolSize: 10 }).connect();
    p.catch(() => g.__itcMongo!.delete(uri)); // allow a retry after a failed connect
    g.__itcMongo!.set(uri, p);
  }
  return p;
}

const strip = <T,>(doc: WithoutMongoId<T> | null): T | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc as WithoutMongoId<T> & Record<string, unknown>;
  void _id;
  return rest as T;
};
const stripAll = <T,>(docs: WithoutMongoId<T>[]): T[] => docs.map((d) => strip<T>(d)!);

const isDup = (e: unknown) => e instanceof MongoServerError && e.code === 11000;

export function createMongoAdapter(uri: string, dbName: string): StorageAdapter {
  let ready: Promise<Db> | null = null;

  const db = (): Promise<Db> => {
    ready ??= (async () => {
      const d = (await client(uri)).db(dbName);
      await Promise.all([
        d.collection("cms_entries").createIndex({ collection: 1, id: 1 }, { unique: true }),
        d.collection("cms_entries").createIndex({ collection: 1, status: 1, position: 1 }),
        d.collection("cms_revisions").createIndex({ collection: 1, entryId: 1, at: -1 }),
        d.collection("cms_users").createIndex({ email: 1 }, { unique: true }),
        d.collection("cms_users").createIndex({ id: 1 }, { unique: true }),
        d.collection("cms_sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        // Mongo removes expired sessions on its own.
        d.collection("cms_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        d.collection("cms_submissions").createIndex({ id: 1 }, { unique: true }),
        d.collection("cms_submissions").createIndex({ status: 1, createdAt: -1 }),
        d.collection("cms_audit").createIndex({ at: -1 }),
      ]);
      return d;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  };

  const col = async <T extends object>(name: string) => (await db()).collection<T>(name);

  return {
    kind: "mongodb",

    async listEntries(collection, opts) {
      const filter: Record<string, unknown> = { collection };
      if (opts?.status) filter.status = { $in: opts.status };
      const c = await col<Entry>("cms_entries");
      return stripAll(await c.find(filter).sort({ position: 1, createdAt: 1 }).toArray());
    },
    async getEntry(collection, id) {
      return strip(await (await col<Entry>("cms_entries")).findOne({ collection, id }));
    },
    async countEntries(collection) {
      return (await col<Entry>("cms_entries")).countDocuments({ collection });
    },
    async maxPosition(collection) {
      const top = await (await col<Entry>("cms_entries")).find({ collection }).sort({ position: -1 }).limit(1).toArray();
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
    async updateEntry(collection, id, patch) {
      const { newId, ...rest } = patch;
      const set: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (newId && newId !== id) set.id = newId;
      try {
        await (await col<Entry>("cms_entries")).updateOne({ collection, id }, { $set: set });
      } catch (e) {
        if (isDup(e)) throw new DuplicateIdError(collection, newId ?? id);
        throw e;
      }
      if (newId && newId !== id) {
        await (await col<Revision>("cms_revisions")).updateMany({ collection, entryId: id }, { $set: { entryId: newId } });
      }
    },
    async deleteEntry(collection, id) {
      await (await col<Entry>("cms_entries")).deleteOne({ collection, id });
    },
    async seedIfEmpty(collection, entries) {
      if (!entries.length) return false;
      const c = await col<Entry>("cms_entries");
      if ((await c.countDocuments({ collection }, { limit: 1 })) > 0) return false;
      try {
        // ordered:false + unique index makes concurrent seeding (parallel build workers) harmless.
        await c.insertMany(entries.map((e) => ({ ...e })), { ordered: false });
      } catch (e) {
        if (!(e instanceof MongoServerError) || !String(e.message).includes("E11000")) throw e;
      }
      return true;
    },

    async addRevision(rev) {
      await (await col<Revision>("cms_revisions")).insertOne({ ...rev });
    },
    async listRevisions(collection, entryId, limit = 20) {
      return stripAll(await (await col<Revision>("cms_revisions")).find({ collection, entryId }).sort({ at: -1 }).limit(limit).toArray());
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
      await (await col<User>("cms_users")).insertOne({ ...user });
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
    async listSubmissions(opts) {
      const filter: Record<string, unknown> = {};
      if (opts?.form) filter.form = opts.form;
      if (opts?.status) filter.status = opts.status;
      return stripAll(await (await col<Submission>("cms_submissions")).find(filter).sort({ createdAt: -1 }).limit(500).toArray());
    },
    async getSubmission(id) {
      return strip(await (await col<Submission>("cms_submissions")).findOne({ id }));
    },
    async updateSubmission(id, patch) {
      await (await col<Submission>("cms_submissions")).updateOne({ id }, { $set: { ...patch, updatedAt: new Date() } });
    },
    async countSubmissions(opts) {
      const filter: { status?: SubmissionStatus } = {};
      if (opts?.status) filter.status = opts.status;
      return (await col<Submission>("cms_submissions")).countDocuments(filter);
    },

    async addAudit(ev: AuditEvent) {
      await (await col<AuditEvent>("cms_audit")).insertOne({ ...ev });
    },
    async listAudit(limit = 100) {
      return stripAll(await (await col<AuditEvent>("cms_audit")).find({}).sort({ at: -1 }).limit(limit).toArray());
    },
  } satisfies StorageAdapter;
}

export type { Status };

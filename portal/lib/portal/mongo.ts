// MongoDB implementation of PortalStore. Shares the CMS's database (and connection pool) via the same env vars.
import { MongoClient, MongoServerError, type Db, type Filter } from "mongodb";
import {
  AccountTakenError, ClaimTakenError,
  type Claim, type Contribution, type ContributionFilter, type Contributor, type ContributorSession,
  type LinkedAccount, type PortalStore, type SyncRun,
} from "@/lib/portal/types";

// Reuses the CMS adapter's per-process client cache (same global key), so there's one pool per URI.
const g = globalThis as unknown as { __itcMongo?: Map<string, Promise<MongoClient>> };
g.__itcMongo ??= new Map();
function client(uri: string): Promise<MongoClient> {
  let p = g.__itcMongo!.get(uri);
  if (!p) {
    p = new MongoClient(uri, { appName: "itc-cms", maxPoolSize: 10 }).connect();
    p.catch(() => g.__itcMongo!.delete(uri));
    g.__itcMongo!.set(uri, p);
  }
  return p;
}

const isDup = (e: unknown) => e instanceof MongoServerError && e.code === 11000;
function strip<T>(doc: unknown): T {
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as T;
}
const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createPortalMongoStore(uri: string, dbName: string): PortalStore {
  let ready: Promise<Db> | null = null;
  const db = (): Promise<Db> => {
    ready ??= (async () => {
      const d = (await client(uri)).db(dbName);
      await Promise.all([
        d.collection("portal_contributors").createIndex({ id: 1 }, { unique: true }),
        d.collection("portal_contributors").createIndex({ handle: 1 }, { unique: true }),
        d.collection("portal_accounts").createIndex({ provider: 1, providerUserId: 1 }, { unique: true }),
        d.collection("portal_accounts").createIndex({ contributorId: 1 }),
        d.collection("portal_sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        d.collection("portal_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        d.collection("portal_contributions").createIndex({ id: 1 }, { unique: true }),
        d.collection("portal_contributions").createIndex({ provider: 1, providerContributionId: 1 }, { unique: true }),
        d.collection("portal_contributions").createIndex({ contributorId: 1, occurredAt: -1 }),
        d.collection("portal_contributions").createIndex({ provider: 1, authorId: 1 }),
        d.collection("portal_claims").createIndex({ id: 1 }, { unique: true }),
        // At most one active claim per issue, enforced by the database.
        d.collection("portal_claims").createIndex({ provider: 1, repo: 1, issue: 1 }, { unique: true, partialFilterExpression: { status: "active" } }),
        d.collection("portal_sync_runs").createIndex({ sourceId: 1, startedAt: -1 }),
      ]);
      return d;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  };
  const col = async <T extends object>(name: string) => (await db()).collection<T>(name);
  const contributions = () => col<Contribution>("portal_contributions");

  const filterOf = (f: ContributionFilter): Filter<Contribution> => {
    const q: Record<string, unknown> = {};
    if (f.contributorId) q.contributorId = f.contributorId;
    if (f.unmatchedOnly) q.contributorId = null;
    if (f.provider) q.provider = f.provider;
    if (f.kind) q.kind = f.kind;
    if (f.house) q.house = f.house;
    if (f.reviewStatus) q["review.status"] = f.reviewStatus;
    if (!f.includeHidden) q.hidden = { $ne: true };
    return q as Filter<Contribution>;
  };
  const authorFilter = (provider: string, a: { id: string; username: string }) => ({
    provider,
    $or: [{ authorId: a.id }, { authorId: { $exists: false }, authorUsername: { $regex: `^${escapeRx(a.username)}$`, $options: "i" } }],
  });

  return {
    kind: "mongodb",

    async createContributor(c) { await (await col<Contributor>("portal_contributors")).insertOne({ ...c }); },
    async getContributor(id) {
      const d = await (await col<Contributor>("portal_contributors")).findOne({ id });
      return d ? strip<Contributor>(d) : null;
    },
    async getContributorByHandle(handle) {
      const d = await (await col<Contributor>("portal_contributors")).findOne({ handle });
      return d ? strip<Contributor>(d) : null;
    },
    async listContributors(opts) {
      const q = opts?.publicWall ? { "profile.public": true, "profile.onWall": true, disabled: { $ne: true } } : {};
      return (await (await col<Contributor>("portal_contributors")).find(q).sort({ createdAt: 1 }).limit(2000).toArray()).map((d) => strip<Contributor>(d));
    },
    async updateContributor(id, patch) { await (await col<Contributor>("portal_contributors")).updateOne({ id }, { $set: patch }); },
    async deleteContributor(id) {
      const d = await db();
      await Promise.all([
        d.collection("portal_accounts").deleteMany({ contributorId: id }),
        d.collection("portal_sessions").deleteMany({ contributorId: id }),
        d.collection("portal_claims").deleteMany({ contributorId: id }),
        d.collection("portal_contributions").deleteMany({ contributorId: id }),
      ]);
      await d.collection("portal_contributors").deleteOne({ id });
    },

    async getAccount(provider, providerUserId) {
      const d = await (await col<LinkedAccount>("portal_accounts")).findOne({ provider, providerUserId });
      return d ? strip<LinkedAccount>(d) : null;
    },
    async listAccounts(contributorId) {
      return (await (await col<LinkedAccount>("portal_accounts")).find({ contributorId }).sort({ linkedAt: 1 }).toArray()).map((d) => strip<LinkedAccount>(d));
    },
    async listAccountsByProvider(provider) {
      return (await (await col<LinkedAccount>("portal_accounts")).find({ provider }).toArray()).map((d) => strip<LinkedAccount>(d));
    },
    async linkAccount(a) {
      const c = await col<LinkedAccount>("portal_accounts");
      const existing = await c.findOne({ provider: a.provider, providerUserId: a.providerUserId });
      if (existing && existing.contributorId !== a.contributorId) throw new AccountTakenError();
      try {
        await c.updateOne(
          { provider: a.provider, providerUserId: a.providerUserId, contributorId: a.contributorId },
          { $set: { username: a.username, displayName: a.displayName, avatarUrl: a.avatarUrl, profileUrl: a.profileUrl }, $setOnInsert: { linkedAt: a.linkedAt } },
          { upsert: true },
        );
      } catch (e) {
        if (isDup(e)) throw new AccountTakenError();
        throw e;
      }
    },
    async unlinkAccount(contributorId, provider, providerUserId) {
      await (await col<LinkedAccount>("portal_accounts")).deleteOne({ contributorId, provider, providerUserId });
    },

    async createSession(s) { await (await col<ContributorSession>("portal_sessions")).insertOne({ ...s }); },
    async getSession(tokenHash) {
      const d = await (await col<ContributorSession>("portal_sessions")).findOne({ tokenHash });
      return d && d.expiresAt > new Date() ? strip<ContributorSession>(d) : null;
    },
    async deleteSession(tokenHash) { await (await col<ContributorSession>("portal_sessions")).deleteOne({ tokenHash }); },
    async deleteSessions(contributorId) { await (await col<ContributorSession>("portal_sessions")).deleteMany({ contributorId }); },

    async upsertContributions(items, match) {
      const c = await contributions();
      let created = 0, updated = 0, matched = 0;
      const now = new Date();
      for (const it of items) {
        const contributorId = match({ id: it.authorId, username: it.authorUsername }, it.provider);
        if (contributorId) matched++;
        const { hidden: _h, review: _r, ...fields } = it;
        void _h; void _r;
        const set: Record<string, unknown> = { ...fields, updatedAt: now };
        // Never un-attach work that already belongs to someone just because the account isn't matched this run.
        if (contributorId) set.contributorId = contributorId;
        const res = await c.updateOne(
          { provider: it.provider, providerContributionId: it.providerContributionId },
          { $set: set, $setOnInsert: { id: crypto.randomUUID(), createdAt: now, ...(contributorId ? {} : { contributorId: null }) } },
          { upsert: true },
        );
        if (res.upsertedCount) created++; else if (res.modifiedCount) updated++;
      }
      return { created, updated, matched };
    },
    async addContribution(x) { await (await contributions()).insertOne({ ...x }); },
    async getContribution(id) {
      const d = await (await contributions()).findOne({ id });
      return d ? strip<Contribution>(d) : null;
    },
    async listContributions(f) {
      return (await (await contributions()).find(filterOf(f)).sort({ occurredAt: -1 }).limit(f.limit ?? 500).toArray()).map((d) => strip<Contribution>(d));
    },
    async updateContribution(id, patch) { await (await contributions()).updateOne({ id }, { $set: { ...patch, updatedAt: new Date() } }); },
    async attachContributions(provider, author, contributorId) {
      const r = await (await contributions()).updateMany({ ...authorFilter(provider, author), contributorId: null } as Filter<Contribution>, { $set: { contributorId } });
      return r.modifiedCount;
    },
    async detachContributions(provider, author, contributorId) {
      await (await contributions()).updateMany({ ...authorFilter(provider, author), contributorId } as Filter<Contribution>, { $set: { contributorId: null } });
    },
    async countContributions(f = {}) { return (await contributions()).countDocuments(filterOf({ includeHidden: true, ...f })); },

    async createClaim(cl) {
      const c = await col<Claim>("portal_claims");
      await c.updateMany({ status: "active", expiresAt: { $lte: new Date() } }, { $set: { status: "expired" } });
      try {
        await c.insertOne({ ...cl });
      } catch (e) {
        if (isDup(e)) throw new ClaimTakenError();
        throw e;
      }
    },
    async listClaims(opts) {
      const c = await col<Claim>("portal_claims");
      await c.updateMany({ status: "active", expiresAt: { $lte: new Date() } }, { $set: { status: "expired" } });
      const q: Record<string, unknown> = {};
      if (opts?.contributorId) q.contributorId = opts.contributorId;
      if (opts?.status) q.status = opts.status;
      return (await c.find(q).sort({ createdAt: -1 }).limit(500).toArray()).map((d) => strip<Claim>(d));
    },
    async releaseClaim(id, by) {
      const c = await col<Claim>("portal_claims");
      const d = await c.findOneAndUpdate({ id, status: "active" }, { $set: { status: "released", releasedBy: by, releasedAt: new Date() } }, { returnDocument: "after" });
      return d ? strip<Claim>(d) : null;
    },
    async markClaimAssigned(id) { await (await col<Claim>("portal_claims")).updateOne({ id }, { $set: { assigned: true } }); },
    async expireClaims() {
      return (await (await col<Claim>("portal_claims")).updateMany({ status: "active", expiresAt: { $lte: new Date() } }, { $set: { status: "expired" } })).modifiedCount;
    },

    async addSyncRun(r) { await (await col<SyncRun>("portal_sync_runs")).insertOne({ ...r }); },
    async updateSyncRun(id, patch) { await (await col<SyncRun>("portal_sync_runs")).updateOne({ id }, { $set: patch }); },
    async listSyncRuns(opts) {
      const q = opts?.sourceId ? { sourceId: opts.sourceId } : {};
      return (await (await col<SyncRun>("portal_sync_runs")).find(q).sort({ startedAt: -1 }).limit(opts?.limit ?? 50).toArray()).map((d) => strip<SyncRun>(d));
    },
    async lastSuccessfulRun(sourceId) {
      const d = await (await col<SyncRun>("portal_sync_runs")).find({ sourceId, status: "ok" }).sort({ startedAt: -1 }).limit(1).toArray();
      return d[0] ? strip<SyncRun>(d[0]) : null;
    },
  };
}

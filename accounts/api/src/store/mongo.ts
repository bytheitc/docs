// MongoDB implementation of AccountsStore, against this service's own database (itc_accounts).
// Only this api connects to it (ARCHITECTURE.md, rule 2).
import { MongoClient, type Db, type Filter } from "mongodb";
import type { AccessToken, AuthCode, Grant, RefreshToken } from "../oauth/types.js";
import type {
  Account, AccountSession, AccountsStore, AuditEvent,
  PartnerClient, PasswordCredential, RecoveryCode, TotpCredential, WebauthnChallenge, WebauthnCredential,
} from "./types.js";

// One connection pool per URI, per process.
const g = globalThis as unknown as { __itcMongo?: Map<string, Promise<MongoClient>> };
g.__itcMongo ??= new Map();
function client(uri: string): Promise<MongoClient> {
  let p = g.__itcMongo!.get(uri);
  if (!p) {
    p = new MongoClient(uri, { appName: "itc-accounts-api", maxPoolSize: 10 }).connect();
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

export function createAccountsMongoStore(uri: string, dbName: string): AccountsStore {
  let ready: Promise<Db> | null = null;
  const db = (): Promise<Db> => {
    ready ??= (async () => {
      const d = (await client(uri)).db(dbName);
      await Promise.all([
        d.collection("accounts_accounts").createIndex({ id: 1 }, { unique: true }),
        d.collection("accounts_accounts").createIndex({ portalContributorId: 1 }, { unique: true }),
        d.collection("accounts_sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        d.collection("accounts_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        // "Sign in with ITC". The TTL indexes matter: an authorization code or an expired token
        // left lying in the database is a credential nobody is watching, so Mongo deletes them.
        d.collection("accounts_oauth_codes").createIndex({ codeHash: 1 }, { unique: true }),
        d.collection("accounts_oauth_codes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 600 }),
        d.collection("accounts_oauth_access").createIndex({ tokenHash: 1 }, { unique: true }),
        d.collection("accounts_oauth_access").createIndex({ clientId: 1, accountId: 1 }),
        d.collection("accounts_oauth_access").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 }),
        d.collection("accounts_oauth_refresh").createIndex({ tokenHash: 1 }, { unique: true }),
        d.collection("accounts_oauth_refresh").createIndex({ clientId: 1, accountId: 1 }),
        d.collection("accounts_oauth_refresh").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 2592000 }),
        d.collection("accounts_oauth_grants").createIndex({ accountId: 1, clientId: 1 }, { unique: true }),
        d.collection("accounts_audit").createIndex({ at: -1 }),
        // First-party credentials, additive to the account the portal handshake already created.
        d.collection("accounts_webauthn_credentials").createIndex({ credentialId: 1 }, { unique: true }),
        d.collection("accounts_webauthn_credentials").createIndex({ accountId: 1 }),
        d.collection("accounts_webauthn_challenges").createIndex({ key: 1 }, { unique: true }),
        d.collection("accounts_webauthn_challenges").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        d.collection("accounts_password_credentials").createIndex({ accountId: 1 }, { unique: true }),
        d.collection("accounts_totp_credentials").createIndex({ accountId: 1 }, { unique: true }),
        d.collection("accounts_recovery_codes").createIndex({ accountId: 1, codeHash: 1 }, { unique: true }),
        // Self-service partner clients.
        d.collection("accounts_partner_clients").createIndex({ clientId: 1 }, { unique: true }),
        d.collection("accounts_partner_clients").createIndex({ ownerAccountId: 1 }),
        d.collection("accounts_partner_clients").createIndex({ status: 1 }),
        // A shared rate limit, one document per key per fixed window.
        d.collection("accounts_rate_limits").createIndex({ key: 1, windowStart: 1 }, { unique: true }),
        d.collection("accounts_rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
      return d;
    })().catch((e) => { ready = null; throw e; });
    return ready;
  };
  const col = async <T extends object>(name: string) => (await db()).collection<T>(name);

  return {
    kind: "mongodb",

    async createAccount(a) { await (await col<Account>("accounts_accounts")).insertOne({ ...a }); },
    async getAccount(id) {
      const d = await (await col<Account>("accounts_accounts")).findOne({ id });
      return d ? strip<Account>(d) : null;
    },
    async getAccountByPortalContributorId(portalContributorId) {
      const d = await (await col<Account>("accounts_accounts")).findOne({ portalContributorId });
      return d ? strip<Account>(d) : null;
    },

    async createSession(s) { await (await col<AccountSession>("accounts_sessions")).insertOne({ ...s }); },
    async getSession(tokenHash) {
      const d = await (await col<AccountSession>("accounts_sessions")).findOne({ tokenHash });
      return d ? strip<AccountSession>(d) : null;
    },
    async deleteSession(tokenHash) { await (await col<AccountSession>("accounts_sessions")).deleteOne({ tokenHash }); },
    async deleteSessions(accountId) { await (await col<AccountSession>("accounts_sessions")).deleteMany({ accountId }); },

    async createAuthCode(c) { await (await col<AuthCode>("accounts_oauth_codes")).insertOne({ ...c }); },

    async redeemAuthCode(codeHash, now) {
      // One atomic step. Two requests racing on the same code must not both come away with tokens,
      // so the "is it still unused?" test and the "mark it used" write are the same operation.
      const d = await (await col<AuthCode>("accounts_oauth_codes")).findOneAndUpdate(
        // Matching null also matches a document with no `usedAt` at all, which is what "not yet
        // redeemed" means here. The driver's types do not allow null for an optional Date, so the
        // filter is cast; the query itself is exactly what Mongo wants.
        { codeHash, usedAt: null, expiresAt: { $gt: now } } as unknown as Filter<AuthCode>,
        { $set: { usedAt: now } },
        { returnDocument: "after" },
      );
      return d ? strip<AuthCode>(d) : null;
    },

    async getAuthCode(codeHash) {
      const d = await (await col<AuthCode>("accounts_oauth_codes")).findOne({ codeHash });
      return d ? strip<AuthCode>(d) : null;
    },

    async createAccessToken(t) { await (await col<AccessToken>("accounts_oauth_access")).insertOne({ ...t }); },

    async getAccessToken(tokenHash) {
      const d = await (await col<AccessToken>("accounts_oauth_access")).findOne({ tokenHash });
      return d ? strip<AccessToken>(d) : null;
    },

    async revokeAccessToken(tokenHash) {
      await (await col<AccessToken>("accounts_oauth_access")).updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
    },

    async createRefreshToken(t) { await (await col<RefreshToken>("accounts_oauth_refresh")).insertOne({ ...t }); },

    async getRefreshToken(tokenHash) {
      const d = await (await col<RefreshToken>("accounts_oauth_refresh")).findOne({ tokenHash });
      return d ? strip<RefreshToken>(d) : null;
    },

    async rotateRefreshToken(oldHash, next) {
      // Same reasoning as redeeming a code: only the request that actually flips the old token
      // from live to replaced may issue the new one. The loser gets false and is refused.
      const d = await (await col<RefreshToken>("accounts_oauth_refresh")).findOneAndUpdate(
        { tokenHash: oldHash, replacedBy: null, revokedAt: null } as unknown as Filter<RefreshToken>,
        { $set: { replacedBy: next.tokenHash } },
      );
      if (!d) return false;
      await (await col<RefreshToken>("accounts_oauth_refresh")).insertOne({ ...next });
      return true;
    },

    async revokeTokensFor(clientId, accountId) {
      const now = new Date();
      await Promise.all([
        (await col<AccessToken>("accounts_oauth_access")).updateMany({ clientId, accountId, revokedAt: null } as unknown as Filter<AccessToken>, { $set: { revokedAt: now } }),
        (await col<RefreshToken>("accounts_oauth_refresh")).updateMany({ clientId, accountId, revokedAt: null } as unknown as Filter<RefreshToken>, { $set: { revokedAt: now } }),
      ]);
    },

    async upsertGrant(gr) {
      await (await col<Grant>("accounts_oauth_grants")).updateOne(
        { accountId: gr.accountId, clientId: gr.clientId },
        { $set: { scopes: gr.scopes, lastUsedAt: gr.lastUsedAt ?? new Date() }, $setOnInsert: { id: gr.id, createdAt: gr.createdAt } },
        { upsert: true },
      );
    },

    async listGrants(accountId) {
      return (await (await col<Grant>("accounts_oauth_grants")).find({ accountId }).sort({ createdAt: -1 }).toArray()).map((d) => strip<Grant>(d));
    },

    async deleteGrant(accountId, clientId) {
      await (await col<Grant>("accounts_oauth_grants")).deleteOne({ accountId, clientId });
    },

    async addAudit(ev) { await (await col<AuditEvent>("accounts_audit")).insertOne({ ...ev }); },
    async listAudit(opts) {
      return (await (await col<AuditEvent>("accounts_audit")).find({}).sort({ at: -1 }).limit(opts?.limit ?? 200).toArray()).map((d) => strip<AuditEvent>(d));
    },

    async addWebauthnCredential(c) { await (await col<WebauthnCredential>("accounts_webauthn_credentials")).insertOne({ ...c }); },
    async getWebauthnCredential(credentialId) {
      const d = await (await col<WebauthnCredential>("accounts_webauthn_credentials")).findOne({ credentialId });
      return d ? strip<WebauthnCredential>(d) : null;
    },
    async listWebauthnCredentials(accountId) {
      return (await (await col<WebauthnCredential>("accounts_webauthn_credentials")).find({ accountId }).sort({ createdAt: 1 }).toArray()).map((d) => strip<WebauthnCredential>(d));
    },
    async updateWebauthnCredentialCounter(credentialId, counter, now) {
      await (await col<WebauthnCredential>("accounts_webauthn_credentials")).updateOne({ credentialId }, { $set: { counter, lastUsedAt: now } });
    },
    async deleteWebauthnCredential(accountId, credentialId) {
      await (await col<WebauthnCredential>("accounts_webauthn_credentials")).deleteOne({ accountId, credentialId });
    },

    async createWebauthnChallenge(c) { await (await col<WebauthnChallenge>("accounts_webauthn_challenges")).insertOne({ ...c }); },
    async consumeWebauthnChallenge(key, now) {
      // Same reasoning as redeeming an auth code: two requests racing on the same ceremony must
      // not both be told it's still open.
      const d = await (await col<WebauthnChallenge>("accounts_webauthn_challenges")).findOneAndUpdate(
        { key, usedAt: null, expiresAt: { $gt: now } } as unknown as Filter<WebauthnChallenge>,
        { $set: { usedAt: now } },
        { returnDocument: "after" },
      );
      return d ? strip<WebauthnChallenge>(d) : null;
    },

    async setPasswordCredential(c) {
      await (await col<PasswordCredential>("accounts_password_credentials")).updateOne(
        { accountId: c.accountId },
        { $set: { hash: c.hash, salt: c.salt, updatedAt: c.updatedAt }, $setOnInsert: { createdAt: c.createdAt } },
        { upsert: true },
      );
    },
    async getPasswordCredential(accountId) {
      const d = await (await col<PasswordCredential>("accounts_password_credentials")).findOne({ accountId });
      return d ? strip<PasswordCredential>(d) : null;
    },
    async deletePasswordCredential(accountId) {
      await (await col<PasswordCredential>("accounts_password_credentials")).deleteOne({ accountId });
    },

    async setTotpCredential(c) {
      // A fresh enrollment always replaces any previous one — including an old confirmedAt, since
      // a new secret has not yet been proven and must not inherit the old one's confirmed status.
      await (await col<TotpCredential>("accounts_totp_credentials")).replaceOne(
        { accountId: c.accountId }, { ...c }, { upsert: true },
      );
    },
    async getTotpCredential(accountId) {
      const d = await (await col<TotpCredential>("accounts_totp_credentials")).findOne({ accountId });
      return d ? strip<TotpCredential>(d) : null;
    },
    async confirmTotpCredential(accountId, now) {
      await (await col<TotpCredential>("accounts_totp_credentials")).updateOne({ accountId }, { $set: { confirmedAt: now } });
    },
    async deleteTotpCredential(accountId) {
      await (await col<TotpCredential>("accounts_totp_credentials")).deleteOne({ accountId });
    },
    async consumeTotpStep(accountId, step) {
      // Same reasoning as redeeming an auth code: only the request that actually advances
      // lastUsedStep may treat this code as unused. A document with no lastUsedStep yet also
      // matches $lt, since undefined compares as less than any number in this filter's context.
      const d = await (await col<TotpCredential>("accounts_totp_credentials")).findOneAndUpdate(
        { accountId, $or: [{ lastUsedStep: { $exists: false } }, { lastUsedStep: { $lt: step } }] } as unknown as Filter<TotpCredential>,
        { $set: { lastUsedStep: step } },
      );
      return Boolean(d);
    },

    async replaceRecoveryCodes(accountId, codes) {
      const c = await col<RecoveryCode>("accounts_recovery_codes");
      await c.deleteMany({ accountId });
      if (codes.length) await c.insertMany(codes.map((x) => ({ ...x })));
    },
    async consumeRecoveryCode(accountId, codeHash, now) {
      const d = await (await col<RecoveryCode>("accounts_recovery_codes")).findOneAndUpdate(
        { accountId, codeHash, usedAt: null } as unknown as Filter<RecoveryCode>,
        { $set: { usedAt: now } },
      );
      return Boolean(d);
    },
    async countUnusedRecoveryCodes(accountId) {
      return (await col<RecoveryCode>("accounts_recovery_codes")).countDocuments({ accountId, usedAt: null } as unknown as Filter<RecoveryCode>);
    },

    async createPartnerClient(c) { await (await col<PartnerClient>("accounts_partner_clients")).insertOne({ ...c }); },
    async getPartnerClient(clientId) {
      const d = await (await col<PartnerClient>("accounts_partner_clients")).findOne({ clientId });
      return d ? strip<PartnerClient>(d) : null;
    },
    async listPartnerClientsByOwner(ownerAccountId) {
      return (await (await col<PartnerClient>("accounts_partner_clients")).find({ ownerAccountId }).sort({ createdAt: -1 }).toArray()).map((d) => strip<PartnerClient>(d));
    },
    async listPartnerClients(opts) {
      const q = opts?.status ? { status: opts.status } : {};
      return (await (await col<PartnerClient>("accounts_partner_clients")).find(q).sort({ createdAt: 1 }).toArray()).map((d) => strip<PartnerClient>(d));
    },
    async updatePartnerClient(clientId, patch) {
      await (await col<PartnerClient>("accounts_partner_clients")).updateOne({ clientId }, { $set: patch });
    },
    async deletePartnerClient(clientId) {
      await (await col<PartnerClient>("accounts_partner_clients")).deleteOne({ clientId });
    },

    async checkRateLimit(key, limit, windowMs) {
      const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
      const expiresAt = new Date(windowStart.getTime() + windowMs);
      const c = await col<{ key: string; windowStart: Date; count: number; expiresAt: Date }>("accounts_rate_limits");
      const doc = await c.findOneAndUpdate(
        { key, windowStart },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, returnDocument: "after" },
      );
      return (doc?.count ?? 1) <= limit;
    },
  };
}

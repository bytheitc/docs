// Self-service client registration: a partner registers their own app and gets a `client_id`
// back immediately. Scopes that only confirm who someone is are live at once; anything that
// hands out more — contributions, entitlements, offline_access, or a confidential client's claim
// to hold a secret — waits for a staff reviewer (routes/staff.ts). Nothing here can register a
// trusted, consent-skipping client: that stays a CMS entry an editor adds by hand.
//
//   GET    /developers/apps                        my apps
//   POST   /developers/apps                         register one → { client, secret? }
//   GET    /developers/apps/:clientId                one of mine
//   PATCH  /developers/apps/:clientId                { name?, homepage?, redirectUris? }
//   POST   /developers/apps/:clientId/regenerate-secret   confidential only → { secret }
//   DELETE /developers/apps/:clientId
import { Router } from "express";
import { MongoServerError } from "mongodb";
import { badRequest, body, notFound, str, HttpError } from "../http.js";
import { needsAccount, needsDatabase } from "../guard.js";
import { newToken, sha256 } from "../oauth/crypto.js";
import { usableRedirect } from "../oauth/clients.js";
import { SCOPES, type ClientType, type Scope } from "../oauth/types.js";
import { rateLimit } from "../ratelimit.js";
import { generateClientId, needsReview } from "../security/partnerClients.js";
import { requireAccountsStore } from "../store/index.js";
import type { PartnerClient } from "../store/types.js";
import type { Ctx } from "../app.js";

const MAX_APPS_PER_ACCOUNT = 10;
const MAX_REDIRECTS = 10;
const limited = async (ip: string, name: string, max: number) => !(await rateLimit(`developers:${name}:${ip}`, max));

const isScope = (s: unknown): s is Scope => typeof s === "string" && (SCOPES as string[]).includes(s);

/** Never includes the secret hash — that never leaves this api once it is set. */
function view(c: PartnerClient) {
  return {
    clientId: c.clientId, name: c.name, type: c.type, redirectUris: c.redirectUris,
    requestedScopes: c.requestedScopes, allowedScopes: c.allowedScopes, homepage: c.homepage,
    status: c.status, active: c.active, createdAt: c.createdAt, updatedAt: c.updatedAt,
    rejectionReason: c.rejectionReason, hasSecret: Boolean(c.secretHash),
  };
}

function readRedirectUris(b: Record<string, unknown>): string[] {
  const raw = b.redirectUris;
  if (!Array.isArray(raw) || !raw.length) throw badRequest("At least one redirect_uri is required.", { redirectUris: "Required." });
  if (raw.length > MAX_REDIRECTS) throw badRequest(`At most ${MAX_REDIRECTS} redirect URIs.`, { redirectUris: "Too many." });
  const uris = raw.map((u) => String(u).trim()).filter(Boolean);
  const bad = uris.filter((u) => !usableRedirect(u));
  if (bad.length) throw badRequest(`Not a usable redirect_uri: ${bad.join(", ")}`, { redirectUris: "https anywhere, http only on localhost, or a private scheme." });
  return [...new Set(uris)];
}

function readScopes(b: Record<string, unknown>): Scope[] {
  const raw = Array.isArray(b.scopes) ? b.scopes : [];
  const scopes = raw.filter(isScope) as Scope[];
  if (!scopes.includes("openid")) scopes.unshift("openid");
  return [...new Set(scopes)];
}

export function developersRoutes(ctx: Ctx): Router {
  const r = Router();
  r.use("/developers", needsDatabase, needsAccount(ctx));

  r.get("/developers/apps", async (req, res) => {
    const apps = await requireAccountsStore().listPartnerClientsByOwner(req.account!.id);
    res.json({ apps: apps.map(view) });
  });

  r.post("/developers/apps", async (req, res) => {
    if (await limited(req.ip ?? "local", "register", 20)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const store = requireAccountsStore();
    const existing = await store.listPartnerClientsByOwner(req.account!.id);
    if (existing.length >= MAX_APPS_PER_ACCOUNT) throw new HttpError(403, "forbidden", `You can register at most ${MAX_APPS_PER_ACCOUNT} apps. Remove one first.`);

    const b = body(req);
    const name = str(b, "name", { required: true, max: 80 });
    const homepage = str(b, "homepage", { max: 300 });
    if (homepage && !/^https?:\/\//i.test(homepage)) throw badRequest("The homepage must be an http(s) URL.", { homepage: "Must start with http:// or https://." });
    const type: ClientType = b.type === "confidential" ? "confidential" : "public";
    const redirectUris = readRedirectUris(b);
    const requestedScopes = readScopes(b);

    const now = new Date();
    const review = needsReview(type, requestedScopes);
    const secret = type === "confidential" ? newToken() : undefined;

    const base: Omit<PartnerClient, "clientId"> = {
      ownerAccountId: req.account!.id,
      name,
      type,
      secretHash: secret ? sha256(secret) : undefined,
      redirectUris,
      requestedScopes,
      allowedScopes: review ? [] : requestedScopes,
      homepage: homepage || undefined,
      status: review ? "pending" : "approved",
      trusted: false,
      active: true,
      createdAt: now,
      updatedAt: now,
      ...(review ? {} : { reviewedAt: now, reviewedBy: "auto: openid/profile only" }),
    };

    // clientId is a name slug plus 4 random bytes — vanishingly unlikely to collide, but not
    // impossible, and a raw duplicate-key error is not an answer to hand back from an api. A
    // fresh suffix and one retry is simpler than anything that tries to be clever about it.
    let client: PartnerClient | undefined;
    for (let attempt = 0; attempt < 3 && !client; attempt++) {
      const candidate: PartnerClient = { ...base, clientId: generateClientId(name) };
      try {
        await store.createPartnerClient(candidate);
        client = candidate;
      } catch (e) {
        if (!(e instanceof MongoServerError && e.code === 11000) || attempt === 2) throw e;
      }
    }

    // Reached only once the loop above has either set `client` or thrown.
    const saved = client!;
    await store.addAudit({ at: now, actor: req.account!.id, action: "developers.app.register", target: `client/${saved.clientId}`, detail: review ? "pending review" : "auto-approved" });
    res.status(201).json({ client: view(saved), ...(secret ? { secret } : {}) });
  });

  async function owned(req: { account?: { id: string } }, clientId: string): Promise<PartnerClient> {
    const app = await requireAccountsStore().getPartnerClient(clientId);
    if (!app || app.ownerAccountId !== req.account!.id) throw notFound("No such app.");
    return app;
  }

  r.get("/developers/apps/:clientId", async (req, res) => {
    res.json({ app: view(await owned(req, String(req.params.clientId))) });
  });

  r.patch("/developers/apps/:clientId", async (req, res) => {
    const app = await owned(req, String(req.params.clientId));
    const b = body(req);
    const patch: Partial<PartnerClient> = { updatedAt: new Date() };
    if (b.name !== undefined) patch.name = str(b, "name", { required: true, max: 80 });
    if (b.homepage !== undefined) {
      const homepage = str(b, "homepage", { max: 300 });
      if (homepage && !/^https?:\/\//i.test(homepage)) throw badRequest("The homepage must be an http(s) URL.", { homepage: "Must start with http:// or https://." });
      patch.homepage = homepage || undefined;
    }
    if (b.redirectUris !== undefined) patch.redirectUris = readRedirectUris(b);
    await requireAccountsStore().updatePartnerClient(app.clientId, patch);
    res.json({ app: view({ ...app, ...patch }) });
  });

  r.post("/developers/apps/:clientId/regenerate-secret", async (req, res) => {
    const app = await owned(req, String(req.params.clientId));
    if (app.type !== "confidential") throw badRequest("Only a confidential app has a secret.");
    if (await limited(req.ip ?? "local", "regen", 10)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const secret = newToken();
    const now = new Date();
    await requireAccountsStore().updatePartnerClient(app.clientId, { secretHash: sha256(secret), updatedAt: now });
    await requireAccountsStore().addAudit({ at: now, actor: req.account!.id, action: "developers.app.regenerate_secret", target: `client/${app.clientId}` });
    res.json({ secret });
  });

  r.delete("/developers/apps/:clientId", async (req, res) => {
    const app = await owned(req, String(req.params.clientId));
    await requireAccountsStore().deletePartnerClient(app.clientId);
    await requireAccountsStore().addAudit({ at: new Date(), actor: req.account!.id, action: "developers.app.delete", target: `client/${app.clientId}` });
    res.json({ ok: true });
  });

  return r;
}

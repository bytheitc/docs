// Reviewing a partner's app, behind a CMS account with access to the "accounts" space. There is
// no second password: this proxies the CMS's own sign-in, exactly like portal's staff tools.
//
//   POST /staff/login                                 proxies the CMS sign-in
//   GET  /staff/me
//   GET  /staff/partner-apps?status=pending            the review queue (defaults to pending)
//   POST /staff/partner-apps/:clientId/approve         { scopes? }  — narrow the grant if you like
//   POST /staff/partner-apps/:clientId/reject          { reason }
import { Router } from "express";
import { badRequest, body, notFound, str, HttpError } from "../http.js";
import { atLeast, needsDatabase, needsStaff } from "../guard.js";
import { SCOPES, type Scope } from "../oauth/types.js";
import { resolveProfile } from "../profile.js";
import { rateLimit } from "../ratelimit.js";
import { requireAccountsStore } from "../store/index.js";
import type { PartnerClient } from "../store/types.js";
import type { Ctx } from "../app.js";

const isScope = (s: unknown): s is Scope => typeof s === "string" && (SCOPES as string[]).includes(s);
const limited = async (ip: string) => !(await rateLimit(`staff-login:${ip}`, 10));

export function staffRoutes(ctx: Ctx): Router {
  const { cms } = ctx;
  const r = Router();

  r.post("/staff/login", async (req, res) => {
    if (await limited(req.ip ?? "local")) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const b = body(req);
    const email = str(b, "email", { required: true, max: 200 });
    const password = str(b, "password", { required: true, max: 200 });
    const result = await cms.login(email, password);
    if ("error" in result) throw new HttpError(result.status, result.status === 429 ? "rate_limited" : "unauthorized", result.error);
    const user = await cms.introspect(result.token);
    if (!user) throw new HttpError(403, "forbidden", "That account can't open the accounts space.");
    res.json({ ok: true, token: result.token, expiresAt: result.expiresAt, user });
  });

  r.get("/staff/me", needsStaff(cms), (req, res) => res.json({ user: req.staff }));

  r.use("/staff", needsDatabase, needsStaff(cms));

  r.get("/staff/partner-apps", async (req, res) => {
    const status = str(req.query as Record<string, string>, "status", { max: 20 }) || "pending";
    if (status !== "pending" && status !== "approved" && status !== "rejected") throw badRequest("status must be pending, approved or rejected.");
    const apps = await requireAccountsStore().listPartnerClients({ status });
    // Who is asking matters for a trust decision, so the queue resolves the owner's portal
    // handle — the same live read every id_token already goes through, not a new kind of access.
    const withOwners = await Promise.all(apps.map(async (a: PartnerClient) => {
      const owner = await resolveProfile(ctx, a.ownerAccountId).catch(() => null);
      return {
        clientId: a.clientId, name: a.name, type: a.type, redirectUris: a.redirectUris,
        requestedScopes: a.requestedScopes, allowedScopes: a.allowedScopes, homepage: a.homepage,
        status: a.status, active: a.active, createdAt: a.createdAt, updatedAt: a.updatedAt,
        rejectionReason: a.rejectionReason, hasSecret: Boolean(a.secretHash),
        ownerAccountId: a.ownerAccountId, ownerHandle: owner?.handle,
      };
    }));
    res.json({ apps: withOwners });
  });

  r.post("/staff/partner-apps/:clientId/approve", atLeast("publisher"), async (req, res) => {
    const store = requireAccountsStore();
    const app = await store.getPartnerClient(String(req.params.clientId));
    if (!app) throw notFound("No such app.");
    if (app.status !== "pending") throw badRequest("That app isn't pending review.");

    const b = body(req);
    const requested = Array.isArray(b.scopes) ? b.scopes.filter(isScope) : app.requestedScopes;
    const scopes = requested.includes("openid") ? requested : ["openid" as Scope, ...requested];
    const bad = scopes.filter((s: Scope) => !app.requestedScopes.includes(s));
    if (bad.length) throw badRequest(`Can't grant scopes the app never asked for: ${bad.join(", ")}`);

    const now = new Date();
    await store.updatePartnerClient(app.clientId, { status: "approved", allowedScopes: scopes, active: true, reviewedAt: now, reviewedBy: req.staff!.email, updatedAt: now });
    await store.addAudit({ at: now, actor: req.staff!.email, action: "staff.partner_app.approve", target: `client/${app.clientId}`, detail: scopes.join(" ") });
    res.json({ ok: true });
  });

  r.post("/staff/partner-apps/:clientId/reject", atLeast("publisher"), async (req, res) => {
    const store = requireAccountsStore();
    const app = await store.getPartnerClient(String(req.params.clientId));
    if (!app) throw notFound("No such app.");
    if (app.status !== "pending") throw badRequest("That app isn't pending review.");

    const reason = str(body(req), "reason", { max: 500 });
    const now = new Date();
    await store.updatePartnerClient(app.clientId, { status: "rejected", active: false, reviewedAt: now, reviewedBy: req.staff!.email, rejectionReason: reason || undefined, updatedAt: now });
    await store.addAudit({ at: now, actor: req.staff!.email, action: "staff.partner_app.reject", target: `client/${app.clientId}`, detail: reason });
    res.json({ ok: true });
  });

  return r;
}

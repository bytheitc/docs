// The portal's staff tools, behind a CMS account with access to the "portal" space. portal/web serves
// them at /staff; the CMS space links there, and the same sign-in covers both (ARCHITECTURE.md).
//
// Editors read. Publishers verify work, hide it, release claims and run sync. Admins disable people.
// Every change is written to the portal's own audit log, because this api owns the data it changes.
import { Router } from "express";
import { HttpError, badRequest, body, notFound, rateLimit, str } from "../http.js";
import { getSources } from "../portal/content.js";
import { atLeast, needsDatabase, needsStaff } from "../portal/guard.js";
import { requirePortalStore } from "../portal/store.js";
import { syncSource } from "../portal/sync.js";
import type { ReviewStatus } from "../portal/types.js";
import { DEV_PROVIDER_ENABLED, PROVIDERS, isConfigured } from "../providers/index.js";
import type { Ctx } from "../app.js";

const LIST_LIMIT = 200;

export function staffRoutes({ cms, config }: Ctx): Router {
  const r = Router();

  /* ---------------- signing in ---------------- */

  // The tools reuse the CMS account, so there is no second password anywhere. This proxies the CMS's
  // own sign-in and then checks that the account may open this space; portal/web keeps the token in
  // an httpOnly cookie on its own origin.
  r.post("/staff/login", rateLimit({ max: 10, windowMs: 10 * 60_000, name: "staff-login", key: (req) => req.ip ?? "unknown" }), async (req, res) => {
    const b = body(req);
    const email = str(b, "email", { required: true, max: 200 });
    const password = str(b, "password", { required: true, max: 200 });
    const result = await cms.login(email, password);
    if ("error" in result) throw new HttpError(result.status, result.status === 429 ? "rate_limited" : "unauthorized", result.error);
    const user = await cms.introspect(result.token);
    if (!user) throw new HttpError(403, "forbidden", "That account can't open the contributor portal's space.");
    res.json({ ok: true, token: result.token, expiresAt: result.expiresAt, user });
  });

  r.get("/staff/me", needsStaff(cms), (req, res) => res.json({ user: req.staff }));

  r.use("/staff", needsDatabase, needsStaff(cms));

  const audit = (req: { staff?: { email: string } }, action: string, target?: string, detail?: string) =>
    requirePortalStore().addAudit({ at: new Date(), actor: req.staff!.email, action, target, detail });

  r.get("/staff/overview", async (req, res) => {
    const store = requirePortalStore();
    const [contributors, pending, total, unmatched, claims, runs, sources] = await Promise.all([
      store.listContributors(),
      store.countContributions({ provider: "self", reviewStatus: "pending" }),
      store.countContributions(),
      store.countContributions({ unmatchedOnly: true }),
      store.listClaims({ status: "active" }),
      store.listSyncRuns({ limit: 5 }),
      getSources(cms),
    ]);
    res.json({
      counts: {
        contributors: contributors.length,
        publicProfiles: contributors.filter((c) => c.profile.public).length,
        pendingReviews: pending,
        contributions: total,
        unmatched,
        activeClaims: claims.length,
        activeSources: sources.filter((s) => s.active).length,
        sources: sources.length,
        providersLive: PROVIDERS.filter(isConfigured).length,
      },
      recentRuns: runs,
      you: req.staff,
    });
  });

  /* ---------------- contributors ---------------- */

  r.get("/staff/contributors", async (_req, res) => {
    res.json({ contributors: await requirePortalStore().listContributors() });
  });

  r.get("/staff/contributors/:id", async (req, res) => {
    const store = requirePortalStore();
    const person = await store.getContributor(String(req.params.id));
    if (!person) throw notFound("No contributor with that id.");
    const [accounts, contributions, claims] = await Promise.all([
      store.listAccounts(person.id),
      store.listContributions({ contributorId: person.id, includeHidden: true }),
      store.listClaims({ contributorId: person.id }),
    ]);
    res.json({ contributor: person, accounts, contributions, claims });
  });

  r.patch("/staff/contributors/:id", atLeast("admin"), async (req, res) => {
    const store = requirePortalStore();
    const id = String(req.params.id);
    const disabled = body(req).disabled === true;
    const person = await store.getContributor(id);
    if (!person) throw notFound("No contributor with that id.");
    await store.updateContributor(id, { disabled });
    // Disabling someone signs them out everywhere, not just here.
    if (disabled) await store.deleteSessions(id);
    await audit(req, disabled ? "portal.contributor.disable" : "portal.contributor.enable", `contributor/${person.handle}`);
    res.json({ ok: true, disabled });
  });

  /* ---------------- contributions ---------------- */

  r.get("/staff/contributions", async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      contributions: await requirePortalStore().listContributions({
        reviewStatus: (["pending", "verified", "declined"] as const).find((s) => s === q.review),
        provider: q.provider,
        house: q.house,
        unmatchedOnly: q.unmatched === "1",
        includeHidden: true,
        limit: LIST_LIMIT,
      }),
    });
  });

  r.patch("/staff/contributions/:id", atLeast("publisher"), async (req, res) => {
    const store = requirePortalStore();
    const id = String(req.params.id);
    const b = body(req);
    const item = await store.getContribution(id);
    if (!item) throw notFound("No contribution with that id.");

    if (typeof b.hidden === "boolean") {
      await store.updateContribution(id, { hidden: b.hidden });
      await audit(req, b.hidden ? "portal.contribution.hide" : "portal.contribution.unhide", `contribution/${id}`, item.title.slice(0, 120));
      return void res.json({ ok: true, hidden: b.hidden });
    }

    const decision = str(b, "review", { max: 20 }) as ReviewStatus;
    if (decision !== "verified" && decision !== "declined") throw badRequest('Send { hidden: boolean } or { review: "verified" | "declined" }.');
    if (item.provider !== "self") throw badRequest("Only self-logged contributions are reviewed.");
    const note = str(b, "note", { max: 500 });
    await store.updateContribution(id, { review: { status: decision, by: req.staff!.email, at: new Date(), note: note || undefined } });
    await audit(req, `portal.contribution.${decision}`, `contribution/${id}`, item.title.slice(0, 120));
    res.json({ ok: true, review: decision });
  });

  /* ---------------- claims ---------------- */

  r.get("/staff/claims", async (req, res) => {
    const status = (["active", "released", "expired"] as const).find((s) => s === (req.query as Record<string, string>).status);
    res.json({ claims: await requirePortalStore().listClaims({ status }) });
  });

  r.post("/staff/claims/:id/release", atLeast("publisher"), async (req, res) => {
    const claim = await requirePortalStore().releaseClaim(String(req.params.id), req.staff!.email);
    if (!claim) throw notFound("No active claim with that id.");
    await audit(req, "portal.claim.release", `claim/${claim.provider}:${claim.repo}#${claim.issue}`, claim.username);
    res.json({ ok: true, claim });
  });

  /* ---------------- sync ---------------- */

  r.get("/staff/sync", async (_req, res) => {
    const [sources, runs] = await Promise.all([getSources(cms), requirePortalStore().listSyncRuns({ limit: 50 })]);
    res.json({ sources, runs, syncable: PROVIDERS.filter((p) => p.sync).map((p) => p.id) });
  });

  r.post("/staff/sync", atLeast("publisher"), async (req, res) => {
    const which = str(body(req), "source", { max: 100 });
    const all = !which || which === "__all";
    const sources = (await getSources(cms)).filter((s) => (all ? s.active : s.id === which));
    if (!sources.length) throw badRequest(all ? "No active sources to sync." : "No published source with that id.");

    const runs = [];
    for (const source of sources) runs.push(await syncSource(source, req.staff!.email));
    const summary = runs
      .map((run) => `${run.sourceId}: ${run.status} (${run.counts.fetched} fetched, ${run.counts.created} new, ${run.counts.matched} matched)`)
      .join("; ");
    await audit(req, "portal.sync.run", all ? "all sources" : `source/${which}`, summary.slice(0, 500));
    res.json({ ok: true, runs });
  });

  /* ---------------- providers and the audit log ---------------- */

  // What an administrator needs to finish setting a platform up. Each setting is reported as present
  // or missing — never its value, so a staff page can't leak a client secret.
  r.get("/staff/providers", (_req, res) => {
    const env = process.env as Record<string, string | undefined>;
    const present = (names: string[] | undefined) => (names ?? []).map((name) => ({ name, set: Boolean(env[name]) }));
    res.json({
      callbackBase: config.web.url,
      devEnabled: DEV_PROVIDER_ENABLED,
      providers: PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        blurb: p.blurb,
        configured: isConfigured(p),
        canSync: Boolean(p.sync),
        signInSettings: present(p.envVars),
        syncSettings: present(p.syncEnvVars),
        setup: p.setup.map((step) => step.replace("{callback}", `${config.web.url}/auth/${p.id}/callback`)),
        tested: p.tested,
      })),
    });
  });

  r.get("/staff/audit", async (_req, res) => {
    res.json({ events: await requirePortalStore().listAudit({ limit: 100 }) });
  });

  return r;
}

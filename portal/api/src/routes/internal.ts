// The reads accounts/api is allowed: live profile claims for "Sign in with ITC," which moved there
// (ARCHITECTURE.md, "## Accounts"). Signup and the contributor database stay portal's alone (rule
// 2) — this is a service-to-service read, not a door into it. Authenticated by a shared key
// instead of a person's bearer token, the same way cms/api's space keys work.
//
//   GET /internal/contributors/:id            { contributor } or 404
//   GET /internal/contributors/by-handle/:handle   same shape, looked up the other way — for
//                                                   signing in with a password, where all accounts/api
//                                                   is handed is the handle someone typed in
import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { unauthorized } from "../http.js";
import { needsDatabase } from "../portal/guard.js";
import { requirePortalStore } from "../portal/store.js";
import type { Contributor } from "../portal/types.js";
import type { Ctx } from "../app.js";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function internalRoutes(ctx: Ctx): Router {
  const r = Router();

  const authed: import("express").RequestHandler = (req, _res, next) => {
    const key = ctx.config.accountsServiceKey;
    const given = (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!key || !given || !safeEqual(given, key)) return next(unauthorized("Not allowed."));
    next();
  };

  async function respond(res: import("express").Response, contributor: Contributor | null) {
    if (!contributor) return void res.status(404).json({ error: { code: "not_found", message: "No such contributor." } });
    const contributions = await requirePortalStore().listContributions({ contributorId: contributor.id, includeHidden: false });
    res.set("cache-control", "no-store");
    res.json({
      contributor: {
        id: contributor.id,
        handle: contributor.handle,
        displayName: contributor.displayName,
        avatarUrl: contributor.avatarUrl,
        tier: contributor.tier,
        entitlements: contributor.entitlements,
        disabled: Boolean(contributor.disabled),
        contributions: contributions.length,
        houses: [...new Set(contributions.map((c) => c.house))],
      },
    });
  }

  r.get("/internal/contributors/by-handle/:handle", needsDatabase, authed, async (req, res) => {
    await respond(res, await requirePortalStore().getContributorByHandle(String(req.params.handle ?? "")));
  });

  r.get("/internal/contributors/:id", needsDatabase, authed, async (req, res) => {
    await respond(res, await requirePortalStore().getContributor(String(req.params.id ?? "")));
  });

  return r;
}

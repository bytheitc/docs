// What accounts/web needs to render its own pages (a greeting, the consent screen's "is this you")
// — not the OAuth/OIDC surface itself, which lives in routes/oauth.ts.
//
//   GET /account/me   the signed-in ITC account's profile, or 401
import { Router } from "express";
import { needsAccount, needsDatabase } from "../guard.js";
import { resolveProfile } from "../profile.js";
import type { Ctx } from "../app.js";

export function accountRoutes(ctx: Ctx): Router {
  const r = Router();

  r.get("/account/me", needsDatabase, needsAccount(ctx), async (req, res) => {
    const profile = await resolveProfile(ctx, req.account!.id);
    if (!profile || profile.disabled) return void res.status(401).json({ error: { code: "unauthorized", message: "That account is not available." } });
    res.json({ account: profile });
  });

  return r;
}

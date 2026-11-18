// Staff sign-in, behind a CMS account with access to the "email" space. There is no second
// password: this proxies the CMS's own sign-in, exactly like accounts/api's staff tools.
//
//   POST /staff/login
//   GET  /staff/me
//   GET  /staff/readiness      what's still missing before real mail can go out (see readiness.ts)
//   GET  /staff/transactional  the last 100 messages other houses sent through here
import { Router } from "express";
import type { Ctx } from "../app.js";
import { body, str, HttpError } from "../http.js";
import { needsDatabase, needsStaff } from "../guard.js";
import { checkReadiness } from "../readiness.js";
import { requireEmailStore } from "../store/index.js";

export function staffRoutes(ctx: Ctx): Router {
  const { cms } = ctx;
  const r = Router();

  r.post("/staff/login", async (req, res) => {
    const b = body(req);
    const email = str(b, "email", { required: true, max: 200 });
    const password = str(b, "password", { required: true, max: 200 });
    const result = await cms.login(email, password);
    if ("error" in result) throw new HttpError(result.status, result.status === 429 ? "rate_limited" : "unauthorized", result.error);
    const user = await cms.introspect(result.token);
    if (!user) throw new HttpError(403, "forbidden", "That account can't open the email space.");
    res.json({ ok: true, token: result.token, expiresAt: result.expiresAt, user });
  });

  r.get("/staff/me", needsStaff(cms), (req, res) => res.json({ user: req.staff }));

  r.get("/staff/readiness", needsStaff(cms), async (_req, res) => {
    res.json(await checkReadiness(ctx.config, ctx.mailer));
  });

  r.get("/staff/transactional", needsDatabase, needsStaff(cms), async (_req, res) => {
    res.json({ messages: await requireEmailStore().listTransactional(100) });
  });

  return r;
}

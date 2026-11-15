// How someone gets an ITC account session. Signup stays entirely portal's: this proxies portal/api's
// existing `/auth/authorize` and `/auth/callback` — the same federated sign-in portal/web and mobile
// already use — with accounts/web's own redirect URI. The resulting portal session token is used
// exactly once, to read `/me`, then discarded; it is never stored (ARCHITECTURE.md rule 2 stays
// intact: this api still never touches portal's database, only its api).
//
//   GET  /login/providers    which platforms portal/api can sign someone in with
//   POST /login/authorize    { provider, redirectUri, next? } → { url, state, verifier, next }
//   POST /login/callback     { provider, code, redirectUri, verifier, next? } → { to, token?, expiresAt? }
//   POST /login/signout      ends this session
//   POST /login/signout-all  ends every session of the signed-in account
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { badRequest, body, str, HttpError } from "../http.js";
import { needsAccount, needsDatabase } from "../guard.js";
import { PortalClient } from "../portal-client.js";
import { rateLimit } from "../ratelimit.js";
import { bearerToken, endAccountSession, startAccountSession } from "../session.js";
import { requireAccountsStore } from "../store/index.js";
import type { Ctx } from "../app.js";

const limited = async (ip: string) => !(await rateLimit(`login:${ip}`, 30));

export function loginRoutes(ctx: Ctx): Router {
  const r = Router();
  const portal = new PortalClient(ctx.config);

  r.get("/login/providers", async (_req, res) => {
    res.json(await portal.providers());
  });

  r.post("/login/authorize", needsDatabase, async (req, res) => {
    if (await limited(req.ip ?? "local")) throw new HttpError(429, "rate_limited", "Too many sign-in attempts. Try again shortly.");
    const b = body(req);
    const result = await portal.authorize({
      provider: str(b, "provider", { required: true, max: 40 }),
      redirectUri: str(b, "redirectUri", { required: true, max: 500 }),
      next: str(b, "next", { max: 500 }) || undefined,
      user: str(b, "user", { max: 60 }) || undefined,
    });
    if ("error" in result) throw badRequest(result.error, { provider: result.error });
    res.json(result);
  });

  r.post("/login/callback", needsDatabase, async (req, res) => {
    if (await limited(req.ip ?? "local")) throw new HttpError(429, "rate_limited", "Too many sign-in attempts. Try again shortly.");
    const b = body(req);
    const result = await portal.callback({
      provider: str(b, "provider", { required: true, max: 40 }),
      code: str(b, "code", { required: true, max: 2000 }),
      redirectUri: str(b, "redirectUri", { required: true, max: 500 }),
      verifier: str(b, "verifier", { max: 200 }) || undefined,
      next: str(b, "next", { max: 500 }) || undefined,
    });
    if (!result.ok) return void res.status(result.status === 429 ? 429 : 502).json({ ok: false, error: result.error });
    if (!result.token) {
      // Should not happen on a fresh (unauthenticated) callback — portal/api only omits the token
      // when it was linking an existing session, and accounts/web never sends one.
      return void res.status(502).json({ ok: false, error: "exchange" });
    }

    const contributor = await portal.me(result.token);
    // The portal token is discarded here — it has done its one job.
    if (!contributor || contributor.disabled) return void res.status(403).json({ ok: false, error: "disabled" });

    const store = requireAccountsStore();
    let account = await store.getAccountByPortalContributorId(contributor.id);
    if (!account) {
      account = { id: randomUUID(), portalContributorId: contributor.id, createdAt: new Date() };
      await store.createAccount(account);
    }

    const session = await startAccountSession(account.id);
    res.json({ ok: true, to: result.to, token: session.token, expiresAt: session.expiresAt.toISOString() });
  });

  r.post("/login/signout", async (req, res) => {
    await endAccountSession(bearerToken(req.header("authorization")));
    res.json({ ok: true });
  });

  r.post("/login/signout-all", needsDatabase, needsAccount(ctx), async (req, res) => {
    await requireAccountsStore().deleteSessions(req.account!.id);
    res.json({ ok: true });
  });

  return r;
}

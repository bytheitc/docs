// Contributor sign-in. The browser-facing half of OAuth runs on portal/web (its origin owns the
// redirect URI and the short-lived state cookie); this api does everything that needs a secret:
// it builds the authorize URL, exchanges the code, reads the profile and discards the token.
//
//   GET  /auth/providers   which providers are usable here
//   POST /auth/authorize   { provider, next, redirectUri, user? } → { url, state, verifier, next }
//   POST /auth/callback    { provider, code, state, verifier, redirectUri, next } → { to, token? }
//   POST /auth/signout     ends this session
//   POST /auth/signout-all ends every session of the signed-in contributor
import { Router } from "express";
import { badRequest, body, str } from "../http.js";
import { safeNext, signInOrLink } from "../portal/accounts.js";
import { needsContributor, needsDatabase } from "../portal/guard.js";
import { clientIp, rateLimit } from "../portal/ratelimit.js";
import { bearerToken, contributorForToken, endContributorSession } from "../portal/session.js";
import { requirePortalStore } from "../portal/store.js";
import { DEV_PROVIDER_ENABLED, PROVIDERS, availableProviders, usableProvider } from "../providers/index.js";
import { DEV_USERNAME } from "../providers/dev.js";
import { authorizeUrl, exchangeCode, randomToken } from "../providers/oauth.js";
import type { ProviderProfile } from "../providers/types.js";
import type { Ctx } from "../app.js";
import { HttpError } from "../http.js";

const MAX_CODE = 2000;
const limited = (ip: string) => !rateLimit(`auth:${ip}`, 30);

export function authRoutes(_ctx: Ctx): Router {
  const r = Router();

  r.get("/auth/providers", (_req, res) => {
    res.json({
      // Every provider the portal knows, with what the web needs to describe it, and whether this
      // deployment can actually sign in with it. Never the client ids or secrets themselves.
      providers: PROVIDERS.map((p) => ({ id: p.id, name: p.name, category: p.category, blurb: p.blurb, configured: Boolean(usableProvider(p.id)) })),
      usable: availableProviders().map((p) => ({ id: p.id, name: p.name, category: p.category })),
      devEnabled: DEV_PROVIDER_ENABLED,
    });
  });

  r.post("/auth/authorize", needsDatabase, (req, res) => {
    if (limited(req.ip ?? "local")) throw new HttpError(429, "rate_limited", "Too many sign-in attempts. Try again shortly.");
    const b = body(req);
    const provider = str(b, "provider", { required: true, max: 40 });
    const redirectUri = str(b, "redirectUri", { required: true, max: 500 });
    const next = safeNext(str(b, "next", { max: 500 }));

    if (provider === "dev" && !DEV_PROVIDER_ENABLED) throw badRequest("That provider isn't available.");
    const adapter = usableProvider(provider);
    if (!adapter) throw badRequest("That provider isn't configured.", { provider: "Not configured." });

    const state = randomToken(24);
    const verifier = randomToken(48);

    if (adapter.id === "dev") {
      const user = str(b, "user", { max: 60 }) || "dev-contributor";
      if (!DEV_USERNAME.test(user)) throw badRequest("That development username isn't valid.");
      const url = new URL(redirectUri);
      url.searchParams.set("code", user);
      url.searchParams.set("state", state);
      return void res.json({ url: url.toString(), state, verifier, next, provider: adapter.id });
    }

    const cfg = adapter.oauth(process.env as Record<string, string | undefined>);
    if (!cfg) throw badRequest("That provider isn't configured.", { provider: "Not configured." });
    res.json({ url: authorizeUrl(cfg, redirectUri, state, cfg.pkce ? verifier : null), state, verifier, next, provider: adapter.id });
  });

  r.post("/auth/callback", needsDatabase, async (req, res) => {
    if (limited(req.ip ?? "local")) throw new HttpError(429, "rate_limited", "Too many sign-in attempts. Try again shortly.");
    const b = body(req);
    const provider = str(b, "provider", { required: true, max: 40 });
    const code = str(b, "code", { required: true, max: MAX_CODE });
    const redirectUri = str(b, "redirectUri", { required: true, max: 500 });
    const verifier = str(b, "verifier", { max: 200 });
    const next = safeNext(str(b, "next", { max: 500 }));

    if (provider === "dev" && !DEV_PROVIDER_ENABLED) throw badRequest("That provider isn't available.");
    const adapter = usableProvider(provider);
    if (!adapter) throw badRequest("That provider isn't configured.");

    // Linking rather than signing in: the web forwards the current contributor's session token.
    const me = await contributorForToken(bearerToken(req.header("authorization")));

    let profile: ProviderProfile;
    try {
      if (adapter.id === "dev") {
        profile = await adapter.profile({ dev_user: code }, { fetch, env: {} });
      } else {
        const cfg = adapter.oauth(process.env as Record<string, string | undefined>);
        if (!cfg) throw new Error("not configured");
        // The access token lives only inside this block: used once for the profile, never stored or logged.
        const token = await exchangeCode(fetch, cfg, code, redirectUri, cfg.pkce ? verifier : null);
        profile = await adapter.profile(token, { fetch, env: process.env as Record<string, string | undefined> });
      }
    } catch {
      return void res.status(502).json({ ok: false, error: "exchange" });
    }

    const result = await signInOrLink(adapter.id, profile, next, me);
    if (!result.ok) return void res.status(409).json({ ok: false, error: result.error });
    res.json({
      ok: true,
      to: result.to,
      ...(result.session ? { token: result.session.token, expiresAt: result.session.expiresAt.toISOString() } : {}),
    });
  });

  r.post("/auth/signout", async (req, res) => {
    await endContributorSession(bearerToken(req.header("authorization")));
    res.json({ ok: true });
  });

  r.post("/auth/signout-all", needsDatabase, needsContributor(), async (req, res) => {
    await requirePortalStore().deleteSessions(req.contributor!.id);
    res.json({ ok: true });
  });

  return r;
}

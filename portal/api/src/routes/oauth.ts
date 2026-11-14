// "Sign in with ITC" — the OAuth 2.0 / OpenID Connect surface of the portal.
//
//   GET  /oauth/.well-known/openid-configuration   discovery, so clients configure themselves
//   GET  /oauth/jwks                               the id_token signing key
//   GET  /oauth/authorize                          validates the request; portal/web renders consent
//   POST /oauth/authorize                          the signed-in person approves; returns the redirect
//   POST /oauth/token                              authorization_code and refresh_token grants
//   GET  /oauth/userinfo                           claims for a bearer access token
//   POST /oauth/introspect                         for resource servers: is this token live?
//   POST /oauth/revoke                             a client hands a token back
//   GET  /oauth/grants, DELETE /oauth/grants/:id   what a person has connected, and taking it back
//
// The browser half lives on portal/web, which owns the session cookie. This api never reads a
// cookie and never renders a page: it validates, decides, and hands back a URL to redirect to.
import { Router, type ErrorRequestHandler } from "express";
import { body, str } from "../http.js";
import { getClient, listClients, redirectAllowed } from "../oauth/clients.js";
import { jwks, safeEqual, sha256, signingKey } from "../oauth/crypto.js";
import { createAuthCode, identityClaims, redeemCode, useRefreshToken } from "../oauth/flow.js";
import { SCOPES, SCOPE_DESCRIPTIONS, OAuthError, invalidClient, invalidRequest, type OAuthClient, type Scope } from "../oauth/types.js";
import { needsDatabase } from "../portal/guard.js";
import { rateLimit } from "../portal/ratelimit.js";
import { bearerToken, contributorForToken } from "../portal/session.js";
import { requirePortalStore } from "../portal/store.js";
import type { Ctx } from "../app.js";

/** The issuer, as clients will see it. Must match what discovery advertises, exactly. */
const issuerOf = (publicUrl: string) => `${publicUrl}/oauth`;

/**
 * Client authentication at the token endpoint.
 *
 * A confidential client proves itself with its secret, compared in constant time against the hash
 * in the registry. A public client has nothing to prove with — PKCE is what protects it — so it is
 * authenticated by identifying itself, and the code's binding does the rest.
 */
async function authenticateClient(ctx: Ctx, req: { header(n: string): string | undefined; body: unknown }): Promise<OAuthClient> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  let clientId = typeof b.client_id === "string" ? b.client_id : "";
  let secret = typeof b.client_secret === "string" ? b.client_secret : "";

  // HTTP Basic is the form the RFC prefers, and some libraries only send that.
  const auth = req.header("authorization");
  if (auth?.toLowerCase().startsWith("basic ")) {
    const [id, ...rest] = Buffer.from(auth.slice(6), "base64").toString("utf8").split(":");
    clientId = decodeURIComponent(id ?? "");
    secret = decodeURIComponent(rest.join(":"));
  }

  const client = await getClient(ctx.cms, clientId);
  if (!client) throw invalidClient("Unknown client.");

  if (client.type === "confidential") {
    if (!secret || !client.secretHash || !safeEqual(sha256(secret), client.secretHash)) {
      throw invalidClient("That client secret is not correct.");
    }
  }
  return client;
}

export function oauthRoutes(ctx: Ctx): Router {
  const r = Router();
  const publicUrl = ctx.config.publicUrl;
  const issuer = issuerOf(publicUrl);

  const limited = (ip: string, name: string, max: number) => !rateLimit(`oauth:${name}:${ip}`, max);

  /* ---------------- discovery ---------------- */

  r.get("/oauth/.well-known/openid-configuration", (_req, res) => {
    res.json({
      issuer,
      authorization_endpoint: `${publicUrl}/oauth/authorize`,
      token_endpoint: `${publicUrl}/oauth/token`,
      userinfo_endpoint: `${publicUrl}/oauth/userinfo`,
      introspection_endpoint: `${publicUrl}/oauth/introspect`,
      revocation_endpoint: `${publicUrl}/oauth/revoke`,
      jwks_uri: `${publicUrl}/oauth/jwks`,
      scopes_supported: SCOPES,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
      // Advertised, and enforced: there is no path through this provider without PKCE.
      code_challenge_methods_supported: ["S256"],
      claims_supported: ["sub", "preferred_username", "name", "picture", "itc_tier", "itc_entitlements"],
    });
  });

  r.get("/oauth/jwks", (_req, res) => {
    res.set("cache-control", "public, max-age=3600");
    res.json(jwks(signingKey()));
  });

  /* ---------------- authorize ---------------- */

  /**
   * Describes an authorization request so portal/web can render the consent screen.
   *
   * Nothing is issued here. The client and redirect are checked first: only once they are known
   * good may an error be sent back to the client, and until then errors belong on our own page.
   */
  r.get("/oauth/authorize", needsDatabase, async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const client = await getClient(ctx.cms, q.client_id ?? "");
    if (!client) throw invalidRequest("Unknown or inactive client.");
    if (!redirectAllowed(client, q.redirect_uri ?? "")) throw invalidRequest("That redirect_uri is not registered for this client.");

    const requested = (q.scope ?? "openid").split(/\s+/).filter(Boolean);
    const unknown = requested.filter((s) => !client.allowedScopes.includes(s as Scope));

    const me = await contributorForToken(bearerToken(req.header("authorization")));
    const grants = me ? await requirePortalStore().listGrants(me.id) : [];
    const existing = grants.find((g) => g.clientId === client.clientId);

    res.json({
      client: { clientId: client.clientId, name: client.name, homepage: client.homepage, trusted: client.trusted },
      scopes: requested.filter((s) => !unknown.includes(s)).map((s) => ({ id: s, description: SCOPE_DESCRIPTIONS[s as Scope] })),
      unknownScopes: unknown,
      signedIn: !!me,
      // A client the collective ships, which the person has already connected, does not need to be
      // asked again. Anything else is asked every time until they grant it.
      needsConsent: !(client.trusted || (existing && requested.every((s) => (existing.scopes as string[]).includes(s)))),
    });
  });

  /** The person approves. Requires their session; returns the URL for portal/web to redirect to. */
  r.post("/oauth/authorize", needsDatabase, async (req, res) => {
    if (limited(req.ip ?? "local", "authorize", 60)) throw new OAuthError(429, "temporarily_unavailable", "Too many requests.");
    const b = body(req);
    const me = await contributorForToken(bearerToken(req.header("authorization")));
    if (!me) throw new OAuthError(401, "login_required", "Sign in first.");

    const clientId = str(b, "client_id", { required: true, max: 100 });
    const client = await getClient(ctx.cms, clientId);
    if (!client) throw invalidRequest("Unknown or inactive client.");

    const redirectUri = str(b, "redirect_uri", { required: true, max: 500 });
    const state = str(b, "state", { max: 500 });

    const { code } = await createAuthCode(
      requirePortalStore(),
      client,
      me,
      {
        clientId,
        redirectUri,
        responseType: str(b, "response_type", { max: 40 }) || "code",
        scope: str(b, "scope", { max: 500 }) || "openid",
        state,
        nonce: str(b, "nonce", { max: 500 }) || undefined,
        codeChallenge: str(b, "code_challenge", { required: true, max: 200 }),
        codeChallengeMethod: str(b, "code_challenge_method", { max: 20 }) || "S256",
      },
      new Date(),
    );

    const to = new URL(redirectUri);
    to.searchParams.set("code", code);
    if (state) to.searchParams.set("state", state);
    res.json({ ok: true, redirectTo: to.toString() });
  });

  /* ---------------- token ---------------- */

  r.post("/oauth/token", needsDatabase, async (req, res) => {
    if (limited(req.ip ?? "local", "token", 120)) throw new OAuthError(429, "temporarily_unavailable", "Too many requests.");
    const client = await authenticateClient(ctx, req);
    const b = body(req);
    const grantType = str(b, "grant_type", { required: true, max: 40 });
    const store = requirePortalStore();
    const key = signingKey();
    const load = (id: string) => store.getContributor(id);

    // Tokens must never be cached by anything between here and the client.
    res.set("cache-control", "no-store");
    res.set("pragma", "no-cache");

    if (grantType === "authorization_code") {
      const out = await redeemCode(
        store, client,
        {
          code: str(b, "code", { required: true, max: 500 }),
          redirectUri: str(b, "redirect_uri", { required: true, max: 500 }),
          codeVerifier: str(b, "code_verifier", { required: true, max: 200 }),
          issuer, key,
        },
        new Date(), load,
      );
      return void res.json(out);
    }

    if (grantType === "refresh_token") {
      const out = await useRefreshToken(
        store, client,
        {
          refreshToken: str(b, "refresh_token", { required: true, max: 500 }),
          scope: str(b, "scope", { max: 500 }) || undefined,
          issuer, key,
        },
        new Date(), load,
      );
      return void res.json(out);
    }

    throw new OAuthError(400, "unsupported_grant_type", `grant_type “${grantType}” is not supported.`);
  });

  /* ---------------- resource endpoints ---------------- */

  /** The access token a request carries, if it is live. Null covers every way it might not be. */
  async function liveToken(header: string | undefined) {
    const raw = bearerToken(header);
    if (!raw) return null;
    const row = await requirePortalStore().getAccessToken(sha256(raw));
    if (!row || row.revokedAt || row.expiresAt <= new Date()) return null;
    return row;
  }

  r.get("/oauth/userinfo", needsDatabase, async (req, res) => {
    const token = await liveToken(req.header("authorization"));
    if (!token) {
      // The RFC wants the reason in a header here, not only in the body.
      res.set("www-authenticate", 'Bearer error="invalid_token"');
      throw new OAuthError(401, "invalid_token", "That access token is not valid.");
    }
    const store = requirePortalStore();
    const me = await store.getContributor(token.contributorId);
    if (!me || me.disabled) throw new OAuthError(401, "invalid_token", "That account is not available.");

    const claims: Record<string, unknown> = { sub: me.id, ...identityClaims(me, token.scopes) };
    if (token.scopes.includes("profile")) claims.profile = `${ctx.config.web.url}/u/${me.handle}`;
    if (token.scopes.includes("contributions")) {
      const list = await store.listContributions({ contributorId: me.id, includeHidden: false });
      claims.itc_contributions = list.length;
      claims.itc_houses = [...new Set(list.map((c) => c.house))];
    }
    res.set("cache-control", "no-store");
    res.json(claims);
  });

  /**
   * Introspection, for the collective's own resource servers.
   *
   * This is why access tokens are opaque: a revoked token stops working the moment it is revoked,
   * rather than whenever a self-contained token would have expired. Client authentication is
   * required — introspection would otherwise be an oracle for guessing tokens.
   */
  r.post("/oauth/introspect", needsDatabase, async (req, res) => {
    await authenticateClient(ctx, req);
    const token = str(body(req), "token", { required: true, max: 500 });
    const row = await requirePortalStore().getAccessToken(sha256(token));
    res.set("cache-control", "no-store");
    if (!row || row.revokedAt || row.expiresAt <= new Date()) return void res.json({ active: false });
    res.json({
      active: true,
      sub: row.contributorId,
      client_id: row.clientId,
      scope: row.scopes.join(" "),
      exp: Math.floor(row.expiresAt.getTime() / 1000),
      iat: Math.floor(row.createdAt.getTime() / 1000),
      iss: issuer,
      token_type: "Bearer",
    });
  });

  /** Revocation always answers 200, even for a token we never had: it must not confirm guesses. */
  r.post("/oauth/revoke", needsDatabase, async (req, res) => {
    const client = await authenticateClient(ctx, req);
    const token = str(body(req), "token", { required: true, max: 500 });
    const hash = sha256(token);
    const store = requirePortalStore();
    const access = await store.getAccessToken(hash);
    if (access && access.clientId === client.clientId) await store.revokeAccessToken(hash);
    else {
      const refresh = await store.getRefreshToken(hash);
      if (refresh && refresh.clientId === client.clientId) await store.revokeTokensFor(client.clientId, refresh.contributorId);
    }
    res.json({ ok: true });
  });

  /* ---------------- what a person has connected ---------------- */

  r.get("/oauth/grants", needsDatabase, async (req, res) => {
    const me = await contributorForToken(bearerToken(req.header("authorization")));
    if (!me) throw new OAuthError(401, "login_required", "Sign in first.");
    const [grants, clients] = await Promise.all([requirePortalStore().listGrants(me.id), listClients(ctx.cms)]);
    res.json({
      grants: grants.map((g) => {
        const c = clients.find((x) => x.clientId === g.clientId);
        return {
          clientId: g.clientId,
          name: c?.name ?? g.clientId,
          homepage: c?.homepage,
          scopes: g.scopes.map((s) => ({ id: s, description: SCOPE_DESCRIPTIONS[s] })),
          createdAt: g.createdAt,
          lastUsedAt: g.lastUsedAt,
        };
      }),
    });
  });

  /** Disconnecting takes the tokens with it; a grant you can revoke without that is theatre. */
  r.delete("/oauth/grants/:clientId", needsDatabase, async (req, res) => {
    const me = await contributorForToken(bearerToken(req.header("authorization")));
    if (!me) throw new OAuthError(401, "login_required", "Sign in first.");
    const clientId = String(req.params.clientId ?? "");
    const store = requirePortalStore();
    await store.deleteGrant(me.id, clientId);
    await store.revokeTokensFor(clientId, me.id);
    await store.addAudit({
      at: new Date(), actor: me.handle, action: "oauth.grant.revoke",
      target: `client/${clientId}`, detail: "disconnected by the person",
    });
    res.json({ ok: true });
  });

  /**
   * OAuth errors have their own wire shape — `{ error, error_description }` from RFC 6749, not the
   * portal's `{ error: { code, message } }`. Clients switch on it, so it is handled here rather
   * than teaching the shared handler a second format.
   */
  r.use(((err, _req, res, next) => {
    if (err instanceof OAuthError) {
      res.set("cache-control", "no-store");
      if (err.status === 401) res.set("www-authenticate", `Bearer error="${err.code}"`);
      return void res.status(err.status).json({ error: err.code, error_description: err.message });
    }
    next(err);
  }) as ErrorRequestHandler);

  return r;
}

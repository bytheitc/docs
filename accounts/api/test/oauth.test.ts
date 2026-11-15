// "Sign in with ITC": the paths where a mistake hands someone else's account away.
// No database, no server — a fake store and an explicit clock.
import { strict as assert } from "node:assert";
import { createHash, createPublicKey, randomBytes, verify as nodeVerify } from "node:crypto";
import test from "node:test";

import { redirectAllowed, resolveScopes, usableRedirect } from "../src/oauth/clients.js";
import { jwks, resetSigningKey, sha256, signingKey, verifyPkce } from "../src/oauth/crypto.js";
import { createAuthCode, redeemCode, useRefreshToken } from "../src/oauth/flow.js";
import { OAuthError, type AccessToken, type AccountProfile, type AuthCode, type Grant, type OAuthClient, type RefreshToken } from "../src/oauth/types.js";
import type { AccountsStore } from "../src/store/types.js";

const ME: AccountProfile = {
  id: "acc-1", disabled: false, handle: "amina", displayName: "Amina",
  tier: "member", entitlements: ["institute.library"],
};

const CLIENT: OAuthClient = {
  clientId: "itc-mobile", name: "ITC", type: "public",
  redirectUris: ["itc://auth"],
  allowedScopes: ["openid", "profile", "entitlements", "offline_access"],
  trusted: true, active: true,
};

const OTHER: OAuthClient = { ...CLIENT, clientId: "someone-else" };

/** A PKCE pair, made the way a client would. */
function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

function fakeStore() {
  const codes: AuthCode[] = [];
  const access: AccessToken[] = [];
  const refresh: RefreshToken[] = [];
  const grants: Grant[] = [];
  const revoked: string[] = [];

  const store = {
    async createAuthCode(c: AuthCode) { codes.push({ ...c }); },
    async redeemAuthCode(codeHash: string, now: Date) {
      const c = codes.find((x) => x.codeHash === codeHash && !x.usedAt && x.expiresAt > now);
      if (!c) return null;
      c.usedAt = now;
      return { ...c };
    },
    async getAuthCode(codeHash: string) { return codes.find((x) => x.codeHash === codeHash) ?? null; },
    async createAccessToken(t: AccessToken) { access.push({ ...t }); },
    async getAccessToken(h: string) { return access.find((x) => x.tokenHash === h) ?? null; },
    async revokeAccessToken(h: string) { const t = access.find((x) => x.tokenHash === h); if (t) t.revokedAt = new Date(); },
    async createRefreshToken(t: RefreshToken) { refresh.push({ ...t }); },
    async getRefreshToken(h: string) { return refresh.find((x) => x.tokenHash === h) ?? null; },
    async rotateRefreshToken(oldHash: string, next: RefreshToken) {
      const old = refresh.find((x) => x.tokenHash === oldHash && !x.replacedBy && !x.revokedAt);
      if (!old) return false;
      old.replacedBy = next.tokenHash;
      refresh.push({ ...next });
      return true;
    },
    async revokeTokensFor(clientId: string, accountId: string) {
      revoked.push(`${clientId}:${accountId}`);
      for (const t of access) if (t.clientId === clientId && t.accountId === accountId) t.revokedAt = new Date();
      for (const t of refresh) if (t.clientId === clientId && t.accountId === accountId) t.revokedAt = new Date();
    },
    async upsertGrant(g: Grant) { grants.push({ ...g }); },
    async listGrants(id: string) { return grants.filter((g) => g.accountId === id); },
    async deleteGrant() {},
  } as unknown as AccountsStore;

  return { store, codes, access, refresh, grants, revoked };
}

const now = () => new Date("2026-11-14T12:00:00Z");
const ISSUER = "https://id.itc.org/oauth";
const load = async (id: string) => (id === ME.id ? ME : null);

function authorizeArgs(challenge: string, over: Partial<Record<string, string>> = {}) {
  return {
    clientId: CLIENT.clientId,
    redirectUri: "itc://auth",
    responseType: "code",
    scope: "openid profile entitlements",
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
    ...over,
  } as Parameters<typeof createAuthCode>[3];
}

/* ------------------------------------------------------------------ PKCE --- */

test("PKCE: the right verifier matches its challenge and a wrong one does not", () => {
  const { verifier, challenge } = pkce();
  assert.equal(verifyPkce(verifier, challenge), true);
  assert.equal(verifyPkce(randomBytes(32).toString("base64url"), challenge), false);
});

test("PKCE: a verifier outside the RFC's shape is refused before it is hashed", () => {
  const { challenge } = pkce();
  assert.equal(verifyPkce("short", challenge), false);
  assert.equal(verifyPkce("!".repeat(50), challenge), false);
});

test("authorize refuses anything but S256 — `plain` protects nothing", async () => {
  const { store } = fakeStore();
  const { challenge } = pkce();
  await assert.rejects(
    () => createAuthCode(store, CLIENT, ME, authorizeArgs(challenge, { codeChallengeMethod: "plain" }), now()),
    (e: OAuthError) => e.code === "invalid_request",
  );
});

test("authorize refuses response_type other than code — no tokens in a redirect", async () => {
  const { store } = fakeStore();
  const { challenge } = pkce();
  await assert.rejects(
    () => createAuthCode(store, CLIENT, ME, authorizeArgs(challenge, { responseType: "token" }), now()),
    (e: OAuthError) => e.code === "invalid_request",
  );
});

/* ------------------------------------------------------------- redirects --- */

test("redirect URIs: https anywhere, http only on loopback, no fragments", () => {
  assert.equal(usableRedirect("https://app.example.org/cb"), true);
  assert.equal(usableRedirect("http://localhost:3000/cb"), true);
  assert.equal(usableRedirect("http://127.0.0.1:3000/cb"), true);
  assert.equal(usableRedirect("itc://auth"), true);
  assert.equal(usableRedirect("http://evil.example.org/cb"), false, "plain http off-loopback");
  assert.equal(usableRedirect("https://app.example.org/cb#x"), false, "a fragment never reaches the server");
  assert.equal(usableRedirect("javascript:alert(1)"), false);
  assert.equal(usableRedirect("not a url"), false);
});

test("redirect matching is exact: no prefixes, no subpaths", () => {
  assert.equal(redirectAllowed(CLIENT, "itc://auth"), true);
  assert.equal(redirectAllowed(CLIENT, "itc://auth/extra"), false);
  assert.equal(redirectAllowed(CLIENT, "itc://auth?x=1"), false);
});

test("a code cannot be redeemed against a different redirect_uri than it was issued for", async () => {
  const { store } = fakeStore();
  const { verifier, challenge } = pkce();
  const { code } = await createAuthCode(store, CLIENT, ME, authorizeArgs(challenge), now());
  await assert.rejects(
    () => redeemCode(store, CLIENT, { code, redirectUri: "itc://other", codeVerifier: verifier, issuer: ISSUER, key: signingKey() }, now(), load),
    (e: OAuthError) => e.code === "invalid_grant",
  );
});

/* ---------------------------------------------------------------- scopes --- */

test("scopes: unknown ones are rejected rather than quietly dropped", () => {
  const { scopes, rejected } = resolveScopes(CLIENT, ["openid", "profile", "admin", "contributions"]);
  assert.deepEqual(scopes, ["openid", "profile"]);
  // `contributions` is a real scope but not allowed for this client, so it is rejected too.
  assert.deepEqual(rejected.sort(), ["admin", "contributions"]);
});

test("authorize requires openid", async () => {
  const { store } = fakeStore();
  const { challenge } = pkce();
  await assert.rejects(
    () => createAuthCode(store, CLIENT, ME, authorizeArgs(challenge, { scope: "profile" }), now()),
    (e: OAuthError) => e.code === "invalid_scope",
  );
});

test("entitlements are only released when that scope was granted", async () => {
  const { store } = fakeStore();
  const { verifier, challenge } = pkce();
  resetSigningKey();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);

  const a = await createAuthCode(store, CLIENT, ME, authorizeArgs(challenge, { scope: "openid profile" }), now());
  const tokens = await redeemCode(store, CLIENT, { code: a.code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load);
  const claims = JSON.parse(Buffer.from(tokens.id_token!.split(".")[1], "base64url").toString());
  assert.equal(claims.preferred_username, "amina");
  assert.equal(claims.itc_entitlements, undefined, "not asked for, so not given");
  assert.equal(claims.itc_tier, undefined);
});

/* ------------------------------------------------------------ code reuse --- */

test("a code works exactly once", async () => {
  const { store } = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(store, CLIENT, ME, authorizeArgs(challenge), now());
  const args = { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key };

  const first = await redeemCode(store, CLIENT, args, now(), load);
  assert.ok(first.access_token);

  await assert.rejects(() => redeemCode(store, CLIENT, args, now(), load), (e: OAuthError) => e.code === "invalid_grant");
});

test("replaying a code revokes every token it produced — someone else has it", async () => {
  const s = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(s.store, CLIENT, ME, authorizeArgs(challenge), now());
  const args = { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key };

  await redeemCode(s.store, CLIENT, args, now(), load);
  await assert.rejects(() => redeemCode(s.store, CLIENT, args, now(), load));

  assert.deepEqual(s.revoked, ["itc-mobile:acc-1"], "the family is revoked, not merely refused");
  assert.ok(s.access.every((t) => t.revokedAt), "the access token issued from that code is dead");
});

test("a code issued to one client cannot be redeemed by another", async () => {
  const s = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(s.store, CLIENT, ME, authorizeArgs(challenge), now());

  await assert.rejects(
    () => redeemCode(s.store, OTHER, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load),
    (e: OAuthError) => e.code === "invalid_grant",
  );
  assert.deepEqual(s.revoked, ["itc-mobile:acc-1"], "and the real client's tokens are revoked too");
});

test("a stolen code is useless without the verifier", async () => {
  const { store } = fakeStore();
  const { challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(store, CLIENT, ME, authorizeArgs(challenge), now());

  await assert.rejects(
    () => redeemCode(store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: randomBytes(32).toString("base64url"), issuer: ISSUER, key }, now(), load),
    (e: OAuthError) => e.code === "invalid_grant",
  );
});

test("an expired code is refused", async () => {
  const { store } = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(store, CLIENT, ME, authorizeArgs(challenge), now());
  const later = new Date(now().getTime() + 120_000);

  await assert.rejects(
    () => redeemCode(store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, later, load),
    (e: OAuthError) => e.code === "invalid_grant",
  );
});

/* ------------------------------------------------------- refresh tokens --- */

async function signedIn(s: ReturnType<typeof fakeStore>) {
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(s.store, CLIENT, ME, authorizeArgs(challenge, { scope: "openid profile offline_access" }), now());
  const tokens = await redeemCode(s.store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load);
  return { tokens, key };
}

test("offline_access is what produces a refresh token, and nothing else does", async () => {
  const s = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(s.store, CLIENT, ME, authorizeArgs(challenge, { scope: "openid profile" }), now());
  const t = await redeemCode(s.store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load);
  assert.equal(t.refresh_token, undefined);
});

test("a refresh token rotates: the new one works, the old one does not", async () => {
  const s = fakeStore();
  const { tokens, key } = await signedIn(s);
  const first = tokens.refresh_token!;

  const next = await useRefreshToken(s.store, CLIENT, { refreshToken: first, issuer: ISSUER, key }, now(), load);
  assert.ok(next.refresh_token && next.refresh_token !== first, "a different token comes back");

  await assert.rejects(
    () => useRefreshToken(s.store, CLIENT, { refreshToken: first, issuer: ISSUER, key }, now(), load),
    (e: OAuthError) => e.code === "invalid_grant",
  );
});

test("reusing a rotated refresh token revokes the whole family", async () => {
  const s = fakeStore();
  const { tokens, key } = await signedIn(s);
  const first = tokens.refresh_token!;
  await useRefreshToken(s.store, CLIENT, { refreshToken: first, issuer: ISSUER, key }, now(), load);
  await assert.rejects(() => useRefreshToken(s.store, CLIENT, { refreshToken: first, issuer: ISSUER, key }, now(), load));

  assert.ok(s.revoked.includes("itc-mobile:acc-1"));
  assert.ok(s.refresh.every((t) => t.revokedAt), "including the replacement, which the thief may hold");
});

test("a refresh may narrow its scopes but never widen them", async () => {
  const s = fakeStore();
  const { tokens, key } = await signedIn(s);

  const narrowed = await useRefreshToken(s.store, CLIENT, { refreshToken: tokens.refresh_token!, scope: "openid", issuer: ISSUER, key }, now(), load);
  assert.equal(narrowed.scope, "openid");

  await assert.rejects(
    () => useRefreshToken(s.store, CLIENT, { refreshToken: narrowed.refresh_token!, scope: "openid entitlements", issuer: ISSUER, key }, now(), load),
    (e: OAuthError) => e.code === "invalid_scope",
  );
});

test("a refresh token belonging to one client is refused to another", async () => {
  const s = fakeStore();
  const { tokens, key } = await signedIn(s);
  await assert.rejects(
    () => useRefreshToken(s.store, OTHER, { refreshToken: tokens.refresh_token!, issuer: ISSUER, key }, now(), load),
    (e: OAuthError) => e.code === "invalid_grant",
  );
});

/* -------------------------------------------------------------- id_token --- */

test("the id_token verifies against the published JWKS", async () => {
  resetSigningKey();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const s = fakeStore();
  const { verifier, challenge } = pkce();
  const { code } = await createAuthCode(s.store, CLIENT, ME, authorizeArgs(challenge), now());
  const t = await redeemCode(s.store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load);

  const [h, p, sig] = t.id_token!.split(".");
  const published = jwks(key).keys[0];
  const pub = createPublicKey({ key: { kty: "RSA", n: published.n, e: published.e }, format: "jwk" });

  assert.equal(nodeVerify("sha256", Buffer.from(`${h}.${p}`), pub, Buffer.from(sig, "base64url")), true);

  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  assert.equal(header.alg, "RS256");
  assert.equal(header.kid, published.kid, "the kid identifies the key that signed it");

  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  assert.equal(claims.iss, ISSUER);
  assert.equal(claims.sub, ME.id);
  assert.equal(claims.aud, CLIENT.clientId);
  assert.equal(claims.itc_tier, "member");
  assert.deepEqual(claims.itc_entitlements, ["institute.library"]);
});

test("the nonce a client sent comes back in the id_token, and nowhere else", async () => {
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const s = fakeStore();
  const { verifier, challenge } = pkce();
  const { code } = await createAuthCode(s.store, CLIENT, ME, { ...authorizeArgs(challenge), nonce: "n-123" }, now());
  const t = await redeemCode(s.store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load);
  const claims = JSON.parse(Buffer.from(t.id_token!.split(".")[1], "base64url").toString());
  assert.equal(claims.nonce, "n-123");
});

test("a signing key is refused in production unless it was configured", () => {
  resetSigningKey();
  assert.throws(() => signingKey({ NODE_ENV: "production" } as NodeJS.ProcessEnv), /OAUTH_SIGNING_KEY/);
  resetSigningKey();
});

/* ------------------------------------------------------------- hygiene --- */

test("nothing is stored that could be replayed: only hashes", async () => {
  const s = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const a = await createAuthCode(s.store, CLIENT, ME, authorizeArgs(challenge, { scope: "openid offline_access" }), now());

  assert.equal(s.codes[0].codeHash, sha256(a.code));
  assert.ok(!JSON.stringify(s.codes).includes(a.code), "the code itself is never written down");

  const t = await redeemCode(s.store, CLIENT, { code: a.code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), load);
  assert.ok(!JSON.stringify(s.access).includes(t.access_token));
  assert.ok(!JSON.stringify(s.refresh).includes(t.refresh_token!));
});

test("disabled accounts and accounts that no longer exist cannot redeem a code", async () => {
  const { store } = fakeStore();
  const { verifier, challenge } = pkce();
  const key = signingKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  const { code } = await createAuthCode(store, CLIENT, ME, authorizeArgs(challenge), now());

  const gone = async () => null;
  await assert.rejects(
    () => redeemCode(store, CLIENT, { code, redirectUri: "itc://auth", codeVerifier: verifier, issuer: ISSUER, key }, now(), gone),
    (e: OAuthError) => e.code === "access_denied",
  );
});

// The decisions the provider makes, separated from the HTTP that carries them.
//
// Everything here is a function of a store, a clock and plain values, so the security-critical
// paths — PKCE, code replay, refresh rotation — can be tested without a database or a server.
import { randomUUID } from "node:crypto";
import { newToken, safeEqual, sha256, signJwt, verifyPkce, type SigningKey } from "./crypto.js";
import { redirectAllowed, resolveScopes } from "./clients.js";
import {
  accessDenied, invalidGrant, invalidRequest, invalidScope,
  type AccessToken, type AuthCode, type OAuthClient, type RefreshToken, type Scope,
} from "./types.js";
import type { Contributor, PortalStore } from "../portal/types.js";

/** Short: a code only has to survive one redirect. The RFC's ceiling is ten minutes. */
export const CODE_TTL_MS = 60_000;
export const ACCESS_TTL_MS = 3600_000;
export const REFRESH_TTL_MS = 30 * 864e5;

export interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state?: string;
  nonce?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

/**
 * Validates an authorization request and mints a code for an already signed-in contributor.
 *
 * The caller must have established who the person is; this does not authenticate anyone. It
 * deliberately validates the client and redirect URI *before* anything else, because those decide
 * whether it is safe to redirect errors back rather than showing them.
 */
export async function createAuthCode(
  store: PortalStore,
  client: OAuthClient,
  contributor: Contributor,
  req: AuthorizeRequest,
  now: Date,
): Promise<{ code: string; scopes: Scope[] }> {
  if (req.responseType !== "code") {
    // No implicit flow, no hybrid. Tokens never travel in a redirect.
    throw invalidRequest("Only response_type=code is supported.");
  }
  if (!redirectAllowed(client, req.redirectUri)) throw invalidRequest("That redirect_uri is not registered for this client.");
  if (req.codeChallengeMethod !== "S256") throw invalidRequest("code_challenge_method must be S256.");
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(req.codeChallenge)) throw invalidRequest("code_challenge is not a valid S256 challenge.");

  const requested = req.scope.split(/\s+/).filter(Boolean);
  const { scopes, rejected } = resolveScopes(client, requested);
  if (rejected.length) throw invalidScope(`This client may not request: ${rejected.join(", ")}.`);
  if (!scopes.includes("openid")) throw invalidScope("The openid scope is required.");

  const code = newToken();
  await store.createAuthCode({
    codeHash: sha256(code),
    clientId: client.clientId,
    contributorId: contributor.id,
    redirectUri: req.redirectUri,
    scopes,
    codeChallenge: req.codeChallenge,
    codeChallengeMethod: "S256",
    nonce: req.nonce,
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    createdAt: now,
  });

  await store.upsertGrant({
    id: randomUUID(), clientId: client.clientId, contributorId: contributor.id,
    scopes, createdAt: now, lastUsedAt: now,
  });

  return { code, scopes };
}

export interface IssuedTokens {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

async function issue(
  store: PortalStore,
  client: OAuthClient,
  contributor: Contributor,
  scopes: Scope[],
  now: Date,
  opts: { nonce?: string; issuer: string; key: SigningKey; claims?: Record<string, unknown> },
): Promise<IssuedTokens> {
  const access = newToken();
  const accessRow: AccessToken = {
    tokenHash: sha256(access), clientId: client.clientId, contributorId: contributor.id,
    scopes, expiresAt: new Date(now.getTime() + ACCESS_TTL_MS), createdAt: now,
  };
  await store.createAccessToken(accessRow);

  let refresh: string | undefined;
  if (scopes.includes("offline_access")) {
    refresh = newToken();
    const row: RefreshToken = {
      tokenHash: sha256(refresh), clientId: client.clientId, contributorId: contributor.id,
      scopes, expiresAt: new Date(now.getTime() + REFRESH_TTL_MS), createdAt: now,
    };
    await store.createRefreshToken(row);
  }

  const out: IssuedTokens = {
    access_token: access,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    scope: scopes.join(" "),
    ...(refresh ? { refresh_token: refresh } : {}),
  };

  if (scopes.includes("openid")) {
    const iat = Math.floor(now.getTime() / 1000);
    out.id_token = signJwt(
      {
        iss: opts.issuer,
        sub: contributor.id,
        aud: client.clientId,
        iat,
        exp: iat + 3600,
        ...(opts.nonce ? { nonce: opts.nonce } : {}),
        ...(opts.claims ?? {}),
      },
      opts.key,
    );
  }
  return out;
}

/**
 * Redeems an authorization code.
 *
 * The code is consumed atomically by the store, so two requests racing cannot both win. If the
 * code is found but was already used, that is a replay — someone other than the client has it —
 * and every token this client holds for this person is revoked rather than merely refusing.
 */
export async function redeemCode(
  store: PortalStore,
  client: OAuthClient,
  args: { code: string; redirectUri: string; codeVerifier: string; issuer: string; key: SigningKey },
  now: Date,
  loadContributor: (id: string) => Promise<Contributor | null>,
): Promise<IssuedTokens> {
  const codeHash = sha256(args.code);
  const row = await store.redeemAuthCode(codeHash, now);

  if (!row) {
    const seen = await store.getAuthCode(codeHash);
    if (seen?.usedAt) {
      await store.revokeTokensFor(seen.clientId, seen.contributorId);
      throw invalidGrant("That code was already used. Every token issued from it has been revoked.");
    }
    throw invalidGrant("That code is not valid or has expired.");
  }

  // Bound to the client it was issued to, and to the exact redirect it was issued for.
  if (!safeEqual(row.clientId, client.clientId)) {
    await store.revokeTokensFor(row.clientId, row.contributorId);
    throw invalidGrant("That code was issued to a different client.");
  }
  if (row.redirectUri !== args.redirectUri) throw invalidGrant("redirect_uri does not match the one the code was issued for.");
  if (!verifyPkce(args.codeVerifier, row.codeChallenge)) throw invalidGrant("The code_verifier does not match the challenge.");

  const contributor = await loadContributor(row.contributorId);
  if (!contributor || contributor.disabled) throw accessDenied("That account cannot sign in.");

  return issue(store, client, contributor, row.scopes, now, {
    nonce: row.nonce,
    issuer: args.issuer,
    key: args.key,
    claims: identityClaims(contributor, row.scopes),
  });
}

/**
 * Rotates a refresh token.
 *
 * Presenting a refresh token that has already been rotated means two parties hold it, and only one
 * of them is its owner. The whole family is revoked; that is the standard response and the reason
 * rotation is worth the bookkeeping.
 */
export async function useRefreshToken(
  store: PortalStore,
  client: OAuthClient,
  args: { refreshToken: string; scope?: string; issuer: string; key: SigningKey },
  now: Date,
  loadContributor: (id: string) => Promise<Contributor | null>,
): Promise<IssuedTokens> {
  const hash = sha256(args.refreshToken);
  const row = await store.getRefreshToken(hash);
  if (!row) throw invalidGrant("That refresh token is not valid.");

  if (row.replacedBy || row.revokedAt) {
    await store.revokeTokensFor(row.clientId, row.contributorId);
    throw invalidGrant("That refresh token has already been used. Every token for this app has been revoked.");
  }
  if (row.expiresAt <= now) throw invalidGrant("That refresh token has expired.");
  if (!safeEqual(row.clientId, client.clientId)) throw invalidGrant("That refresh token belongs to a different client.");

  // A refresh may narrow its scopes but never widen them.
  let scopes = row.scopes;
  if (args.scope) {
    const asked = args.scope.split(/\s+/).filter(Boolean);
    if (!asked.every((s) => (row.scopes as string[]).includes(s))) throw invalidScope("A refresh cannot widen scope.");
    scopes = asked as Scope[];
  }

  const contributor = await loadContributor(row.contributorId);
  if (!contributor || contributor.disabled) throw accessDenied("That account cannot sign in.");

  const next = newToken();
  const ok = await store.rotateRefreshToken(hash, {
    tokenHash: sha256(next), clientId: client.clientId, contributorId: row.contributorId,
    scopes, expiresAt: new Date(now.getTime() + REFRESH_TTL_MS), createdAt: now,
  });
  // Lost the race against another request rotating the same token: treat it as the replay it is.
  if (!ok) {
    await store.revokeTokensFor(row.clientId, row.contributorId);
    throw invalidGrant("That refresh token has already been used.");
  }

  const issued = await issue(store, client, contributor, scopes, now, {
    issuer: args.issuer, key: args.key, claims: identityClaims(contributor, scopes),
  });
  return { ...issued, refresh_token: next };
}

/** The identity claims that belong in an id_token, by scope. Never more than was asked for. */
export function identityClaims(c: Contributor, scopes: Scope[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (scopes.includes("profile")) {
    out.preferred_username = c.handle;
    out.name = c.displayName;
    if (c.avatarUrl) out.picture = c.avatarUrl;
  }
  if (scopes.includes("entitlements")) {
    out.itc_tier = c.tier ?? "member";
    out.itc_entitlements = c.entitlements ?? [];
  }
  return out;
}

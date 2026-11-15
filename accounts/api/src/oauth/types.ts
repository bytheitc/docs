// "Sign in with ITC": the OAuth 2.0 / OpenID Connect provider, as its own service.
//
// It used to live inside portal/api, because portal was the only api allowed to touch the
// contributor database. It still is (ARCHITECTURE.md rule 2) — this service never touches that
// database. An ITC account here is a thin row pointing at the portal contributor it was created
// from (portal/api's /auth/* flow is still the only way to create one); profile claims
// (handle, tier, entitlements...) are always read live from portal/api, never duplicated.
//
// Shape, and why:
//   * Authorization code + PKCE, always, for every client including confidential ones. There is no
//     implicit flow and no password grant: neither is safe and neither is needed.
//   * Access and refresh tokens are opaque and stored only as SHA-256 hashes, exactly as portal
//     contributor sessions were. A leaked database row cannot be replayed as a token.
//   * The id_token is a signed JWT because that is what every OIDC client library expects. It is the
//     only thing here a client is meant to read without asking us.
//   * Resource servers verify access tokens by introspection rather than by parsing them, so a
//     revoked token stops working immediately instead of at expiry.

/** A scope the provider understands. Anything else on a request is rejected, not ignored. */
export type Scope = "openid" | "profile" | "contributions" | "entitlements" | "offline_access";

export const SCOPES: Scope[] = ["openid", "profile", "contributions", "entitlements", "offline_access"];

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  openid: "Confirm who you are",
  profile: "Your handle, display name and avatar",
  contributions: "The work recorded in your name",
  entitlements: "What your ITC account gives you access to",
  offline_access: "Stay signed in when you are not using the app",
};

export type ClientType = "public" | "confidential";

/**
 * A registered client: either one of the collective's own first-party apps (a CMS entry an editor
 * added — "nothing registers itself") or a partner's self-registered app, approved for the scopes
 * it asked for. `clients.ts` merges the two into this one shape.
 */
export interface OAuthClient {
  clientId: string;
  name: string;
  type: ClientType;
  /**
   * SHA-256 of the client secret, for confidential clients. The secret itself is never stored, and
   * a public client has none — it proves itself with PKCE alone.
   */
  secretHash?: string;
  /** Exact-match redirect URIs. No wildcards, no prefix matching: that is how tokens get stolen. */
  redirectUris: string[];
  allowedScopes: Scope[];
  /**
   * A first-party product, so the consent screen is skipped. Only the collective's own apps should
   * ever carry this; anything else must ask the person.
   */
  trusted: boolean;
  /** Where to send someone who asks what this client is. */
  homepage?: string;
  active: boolean;
}

/** An authorization code. Single use, short-lived, bound to the client and the PKCE challenge. */
export interface AuthCode {
  /** SHA-256 of the code. The code itself is only ever in the redirect. */
  codeHash: string;
  clientId: string;
  /** The ITC account id (`sub` in the id_token) — accounts' own id, not portal's contributor id. */
  accountId: string;
  redirectUri: string;
  scopes: Scope[];
  /** The S256 challenge. The verifier is checked against this at the token endpoint. */
  codeChallenge: string;
  codeChallengeMethod: "S256";
  /** Echoed into the id_token, so a client can tie it to its own request. */
  nonce?: string;
  expiresAt: Date;
  createdAt: Date;
  /** Set the moment it is redeemed, so a replay is detectable rather than merely refused. */
  usedAt?: Date;
}

export interface AccessToken {
  tokenHash: string;
  clientId: string;
  accountId: string;
  scopes: Scope[];
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

export interface RefreshToken {
  tokenHash: string;
  clientId: string;
  accountId: string;
  scopes: Scope[];
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  /**
   * Rotation: redeeming a refresh token issues a new one and points the old at it. If the old one
   * is presented again, the whole family is revoked — that is the standard signal of a stolen token.
   */
  replacedBy?: string;
}

/** A person's standing decision to let a client act for them. */
export interface Grant {
  id: string;
  clientId: string;
  accountId: string;
  scopes: Scope[];
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * The claims a `sub` carries, merged from this service's own account row and a live read of the
 * portal contributor it was created from. `null` fields mean portal/api could not be reached or the
 * contributor no longer exists — callers treat that the same as "disabled."
 */
export interface AccountProfile {
  /** Accounts' own id. This is what `sub` is, in both the id_token and introspection. */
  id: string;
  disabled: boolean;
  handle?: string;
  displayName?: string;
  avatarUrl?: string;
  tier?: string;
  entitlements?: string[];
  /** For the `contributions` scope. Always fetched alongside everything else above — one read of
   * the portal contributor, not a second one only when this scope happens to be asked for. */
  contributions?: number;
  houses?: string[];
}

/** What `GET /oauth/userinfo` returns, by scope. `sub` is always the account id. */
export interface UserInfo {
  sub: string;
  /** profile */
  preferred_username?: string;
  name?: string;
  picture?: string;
  profile?: string;
  /** entitlements */
  itc_tier?: string;
  itc_entitlements?: string[];
  /** contributions */
  itc_contributions?: number;
  itc_houses?: string[];
}

export class OAuthError extends Error {
  constructor(
    readonly status: number,
    /** An RFC 6749 / OIDC error code. Clients switch on this, so it is part of the contract. */
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export const invalidRequest = (m: string) => new OAuthError(400, "invalid_request", m);
export const invalidClient = (m: string) => new OAuthError(401, "invalid_client", m);
export const invalidGrant = (m: string) => new OAuthError(400, "invalid_grant", m);
export const invalidScope = (m: string) => new OAuthError(400, "invalid_scope", m);
export const accessDenied = (m: string) => new OAuthError(403, "access_denied", m);

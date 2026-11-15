// Accounts' own data model. Stored in this service's own database (itc_accounts), in collections
// prefixed `accounts_`. No profile data lives here — handle, display name, avatar, tier and
// entitlements are always read live from portal/api (see ../portal-client.ts) — only the
// identity-provider machinery this service owns itself.
import type { AccessToken, AuthCode, ClientType, Grant, RefreshToken, Scope } from "../oauth/types.js";

/**
 * An ITC account. Thin by design: it exists only to give "Sign in with ITC" a stable `sub` that
 * does not change if portal ever re-keys its own contributor ids. Created once, the first time a
 * portal contributor completes the login handshake (see ../login.js) — there is no other way to
 * create one; signup stays entirely portal's.
 */
export interface Account {
  id: string;
  portalContributorId: string;
  createdAt: Date;
}

/** This service's own session (id.itc.org), as an opaque bearer token — the same shape portal used
 * for contributor sessions, kept separate from any OAuth access token this service also issues. */
export interface AccountSession {
  tokenHash: string;
  accountId: string;
  expiresAt: Date;
  createdAt: Date;
}

/** This service's own audit log, for actions it decides (disconnecting an app, later: registering
 * or reviewing a partner client). Staff actions on portal data stay in portal's own log. */
export interface AuditEvent {
  at: Date;
  actor: string;
  action: string;
  target?: string;
  detail?: string;
}

/**
 * A passkey. Only ever added to an account that already exists — this is additional sign-*in*,
 * never a second way to sign *up*. `publicKey` is base64url, as @simplewebauthn hands it back;
 * there is nothing secret in this row, unlike every other credential below.
 */
export interface WebauthnCredential {
  credentialId: string;
  accountId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  /** What the person called it when adding it ("My laptop"), or a generic fallback. */
  name: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * A pending WebAuthn ceremony's challenge. Single use and short-lived, the same reasoning as an
 * oauth AuthCode: a browser has one ceremony in flight at a time, and the server has to remember
 * what it asked for between "options" and "verify." `accountId` is set for a registration
 * (started by someone already signed in); absent for an authentication (signing in with no
 * account known yet — the credential the browser returns is what identifies one).
 */
export interface WebauthnChallenge {
  key: string;
  challenge: string;
  accountId?: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
}

/** A password, salted and hashed with scrypt. The password itself is never stored. */
export interface PasswordCredential {
  accountId: string;
  hash: string;
  salt: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A TOTP (RFC 6238) secret. Unlike every other credential in this file, the secret itself has to
 * be stored in recoverable form — the server has to compute the same code the authenticator app
 * does — so this is the one row here that isn't a hash. `confirmedAt` is unset until the person
 * proves they can generate a valid code; an unconfirmed secret can't yet be used to sign in,
 * which is what stops a typo during setup from locking someone out silently.
 */
export interface TotpCredential {
  accountId: string;
  secret: string;
  createdAt: Date;
  confirmedAt?: Date;
  /** The most recent 30-second step accepted at sign-in, so the same code can't be replayed
   * within the window `totpStepForCode` still accepts it in. Unset until the first sign-in. */
  lastUsedStep?: number;
}

/** A one-time backup code, for when a person has 2FA on and no authenticator to hand. */
export interface RecoveryCode {
  accountId: string;
  codeHash: string;
  usedAt?: Date;
  createdAt: Date;
}

export type PartnerClientStatus = "pending" | "approved" | "rejected";

/**
 * A partner's self-registered client — the self-service counterpart to a CMS trusted-client
 * entry. Never trusted (consent is never skipped) and never created by anyone but its owner.
 *
 * `allowedScopes` is empty until approval; `requestedScopes` is kept forever as the record of
 * what was actually asked for, even after a staff reviewer may have granted less.
 */
export interface PartnerClient {
  clientId: string;
  ownerAccountId: string;
  name: string;
  type: ClientType;
  secretHash?: string;
  redirectUris: string[];
  requestedScopes: Scope[];
  allowedScopes: Scope[];
  homepage?: string;
  status: PartnerClientStatus;
  /** Self-service apps never skip the consent screen. Kept only so clients.ts can treat every
   * client — CMS and self-service — through the one `OAuthClient` shape. */
  trusted: false;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

/** The one seam every database must implement for accounts' data (Mongo today; others later). */
export interface AccountsStore {
  readonly kind: string;

  // accounts
  createAccount(a: Account): Promise<void>;
  getAccount(id: string): Promise<Account | null>;
  getAccountByPortalContributorId(portalContributorId: string): Promise<Account | null>;

  // this service's own sessions
  createSession(s: AccountSession): Promise<void>;
  getSession(tokenHash: string): Promise<AccountSession | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessions(accountId: string): Promise<void>;

  // "Sign in with ITC" (see oauth/types.ts for the shapes and why they look like this)
  createAuthCode(c: AuthCode): Promise<void>;
  /**
   * Marks the code used and returns it, in one atomic step. Returns null when it does not exist,
   * has expired, or was already redeemed — the caller cannot be allowed to decide that itself,
   * because two requests racing on the same code must not both win.
   */
  redeemAuthCode(codeHash: string, now: Date): Promise<AuthCode | null>;
  /** For telling "never existed" apart from "already used", which is a replay and not a mistake. */
  getAuthCode(codeHash: string): Promise<AuthCode | null>;

  createAccessToken(t: AccessToken): Promise<void>;
  getAccessToken(tokenHash: string): Promise<AccessToken | null>;
  revokeAccessToken(tokenHash: string): Promise<void>;

  createRefreshToken(t: RefreshToken): Promise<void>;
  getRefreshToken(tokenHash: string): Promise<RefreshToken | null>;
  /** Rotation: marks the old token replaced and stores the new one, atomically. */
  rotateRefreshToken(oldHash: string, next: RefreshToken): Promise<boolean>;
  /**
   * Revokes every access and refresh token this client holds for this account. Used when a refresh
   * token is presented twice, which means one of the two holders is not its owner.
   */
  revokeTokensFor(clientId: string, accountId: string): Promise<void>;

  upsertGrant(g: Grant): Promise<void>;
  listGrants(accountId: string): Promise<Grant[]>;
  deleteGrant(accountId: string, clientId: string): Promise<void>;

  // audit log
  addAudit(ev: AuditEvent): Promise<void>;
  listAudit(opts?: { limit?: number }): Promise<AuditEvent[]>;

  // passkeys
  addWebauthnCredential(c: WebauthnCredential): Promise<void>;
  getWebauthnCredential(credentialId: string): Promise<WebauthnCredential | null>;
  listWebauthnCredentials(accountId: string): Promise<WebauthnCredential[]>;
  updateWebauthnCredentialCounter(credentialId: string, counter: number, now: Date): Promise<void>;
  deleteWebauthnCredential(accountId: string, credentialId: string): Promise<void>;

  createWebauthnChallenge(c: WebauthnChallenge): Promise<void>;
  /** Atomic, like redeeming an auth code: marks it used and returns it, or null if it can't be. */
  consumeWebauthnChallenge(key: string, now: Date): Promise<WebauthnChallenge | null>;

  // password
  setPasswordCredential(c: PasswordCredential): Promise<void>;
  getPasswordCredential(accountId: string): Promise<PasswordCredential | null>;
  deletePasswordCredential(accountId: string): Promise<void>;

  // TOTP
  setTotpCredential(c: TotpCredential): Promise<void>;
  getTotpCredential(accountId: string): Promise<TotpCredential | null>;
  confirmTotpCredential(accountId: string, now: Date): Promise<void>;
  deleteTotpCredential(accountId: string): Promise<void>;
  /** Atomic: advances `lastUsedStep` to `step` only if it is still ahead of whatever's stored,
   * so two requests racing on the same code can't both win. Returns false on a replay. */
  consumeTotpStep(accountId: string, step: number): Promise<boolean>;

  // recovery codes
  /** Replaces the whole batch: regenerating invalidates every code from the last batch. */
  replaceRecoveryCodes(accountId: string, codes: RecoveryCode[]): Promise<void>;
  /** Atomic one-time use, the same reasoning as everything else single-use in this store. */
  consumeRecoveryCode(accountId: string, codeHash: string, now: Date): Promise<boolean>;
  countUnusedRecoveryCodes(accountId: string): Promise<number>;

  /**
   * A fixed-window rate limit, shared across every instance of this service — unlike an
   * in-memory counter, which only protects the one process it runs in. Returns whether the
   * caller is still under `limit` for this window; the counter itself lives here, not in the
   * caller, so two instances checking the same key see the same count.
   */
  checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;

  // self-service partner clients
  createPartnerClient(c: PartnerClient): Promise<void>;
  getPartnerClient(clientId: string): Promise<PartnerClient | null>;
  listPartnerClientsByOwner(ownerAccountId: string): Promise<PartnerClient[]>;
  listPartnerClients(opts?: { status?: PartnerClientStatus }): Promise<PartnerClient[]>;
  updatePartnerClient(clientId: string, patch: Partial<Omit<PartnerClient, "clientId" | "ownerAccountId" | "createdAt">>): Promise<void>;
  deletePartnerClient(clientId: string): Promise<void>;
}

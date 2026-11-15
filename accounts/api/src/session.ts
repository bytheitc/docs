// This service's own sessions (id.itc.org), as opaque bearer tokens — the same shape and the same
// security posture portal used for contributor sessions, just one layer up: the api stores only a
// hash, and accounts/web keeps the token in its own httpOnly cookie on its own origin, forwarding
// it here as `Authorization: Bearer …` (ARCHITECTURE.md, rule 3).
import { createHash, randomBytes } from "node:crypto";
import type { Ctx } from "./app.js";
import { resolveProfile } from "./profile.js";
import { getAccountsStore, requireAccountsStore } from "./store/index.js";
import type { Account } from "./store/types.js";

const SESSION_DAYS = 30;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

/** Starts a session and returns the token for the web to put in its cookie. */
export async function startAccountSession(accountId: string): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await requireAccountsStore().createSession({ tokenHash: sha256(token), accountId, expiresAt, createdAt: now });
  return { token, expiresAt };
}

export async function endAccountSession(token: string | null): Promise<void> {
  const store = getAccountsStore();
  if (token && store) await store.deleteSession(sha256(token));
}

/** The bearer token on a request, or null. */
export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S{1,500})$/i.exec(header.trim());
  return m ? m[1] : null;
}

/**
 * The account a token belongs to, or null. Never throws (no database, bad token, expired).
 *
 * Also checks that the portal contributor behind this account is still not disabled — portal is
 * still the only place that decides that, so this is a live read every time, the same one
 * id_token issuance and userinfo already do. Fails closed: if portal can't be reached to confirm
 * it, this session is treated as unusable rather than assumed fine.
 */
export async function accountForToken(ctx: Ctx, token: string | null): Promise<Account | null> {
  const store = getAccountsStore();
  if (!store || !token) return null;
  try {
    const session = await store.getSession(sha256(token));
    if (!session) return null;
    const account = await store.getAccount(session.accountId);
    if (!account) return null;
    const profile = await resolveProfile(ctx, account.id);
    if (!profile || profile.disabled) return null;
    return account;
  } catch {
    return null;
  }
}

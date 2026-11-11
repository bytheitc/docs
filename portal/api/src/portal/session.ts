// Contributor sessions, as opaque bearer tokens.
//
// The api stores only a hash. portal/web keeps the token in its own httpOnly cookie on the web's
// origin and forwards it here as `Authorization: Bearer …` (ARCHITECTURE.md, rule 3), so a browser
// never holds anything this api would accept from another origin.
import { createHash, randomBytes } from "node:crypto";
import { getPortalStore, requirePortalStore } from "./store.js";
import type { Contributor } from "./types.js";

const SESSION_DAYS = 30;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

/** Starts a session and returns the token for the web to put in its cookie. */
export async function startContributorSession(contributorId: string): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await requirePortalStore().createSession({ tokenHash: sha256(token), contributorId, expiresAt, createdAt: now });
  return { token, expiresAt };
}

export async function endContributorSession(token: string | null): Promise<void> {
  const store = getPortalStore();
  if (token && store) await store.deleteSession(sha256(token));
}

/** The bearer token on a request, or null. */
export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S{1,500})$/i.exec(header.trim());
  return m ? m[1] : null;
}

/** The contributor a token belongs to, or null. Never throws (no database, bad token, expired). */
export async function contributorForToken(token: string | null): Promise<Contributor | null> {
  const store = getPortalStore();
  if (!store || !token) return null;
  try {
    const session = await store.getSession(sha256(token));
    if (!session) return null;
    const c = await store.getContributor(session.contributorId);
    return c && !c.disabled ? c : null;
  } catch {
    return null;
  }
}

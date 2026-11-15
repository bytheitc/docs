// The trust gate self-service registration runs on. "Clients are CMS entries... an editor adding
// one is the right amount of ceremony" stays true for the collective's own apps; a partner gets a
// parallel path with its own, smaller ceremony: instant for the scopes that only say who someone
// is, held for review for anything that hands out more.
import { randomBytes } from "node:crypto";
import type { ClientType, Scope } from "../oauth/types.js";

/** Scopes that release more than "who is this" — contributions, entitlements and the ability to
 * stay signed in — plus any confidential client, since that one also claims to hold a secret. */
const SENSITIVE_SCOPES: readonly Scope[] = ["contributions", "entitlements", "offline_access"];

export function needsReview(type: ClientType, scopes: Scope[]): boolean {
  return type === "confidential" || scopes.some((s) => SENSITIVE_SCOPES.includes(s));
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "app";
}

/** A client id is public — it travels in every authorize URL — so it is readable, not secret. */
export function generateClientId(name: string): string {
  return `${slugify(name)}-${randomBytes(4).toString("hex")}`;
}

// The client registry: which applications may ask "Sign in with ITC" who someone is.
//
// Today every client is a CMS entry — one of the collective's own first-party products, added by
// an editor. That ceremony is deliberate for first-party apps. A self-service registry for partner
// apps (reviewed before anything beyond `openid profile` is released) is a separate store this
// module will also read from; `listClients`/`getClient` are the one place that merge the two, so
// nothing else in this service needs to know a client might come from either place.
import type { CmsClient } from "../cms.js";
import type { AccountsStore, PartnerClient } from "../store/types.js";
import { SCOPES, type OAuthClient, type Scope } from "./types.js";

/** What an editor fills in. Everything arrives as loose JSON, so nothing here is trusted. */
export interface ClientDef {
  clientId?: string;
  name?: string;
  type?: string;
  secretHash?: string;
  redirectUris?: string[];
  allowedScopes?: string[];
  trusted?: boolean;
  homepage?: string;
  active?: boolean;
}

const isScope = (s: unknown): s is Scope => typeof s === "string" && (SCOPES as string[]).includes(s);

/**
 * A redirect URI is only usable if we can be sure where it goes.
 *
 * https anywhere; http only on loopback, which is how a native app's local callback works and is
 * the one case the RFC carves out. A custom scheme (itc://…) is allowed for installed apps. No
 * fragments — the fragment never reaches the server and would make exact matching a lie.
 */
export function usableRedirect(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash) return false;
  if (u.protocol === "https:") return true;
  if (u.protocol === "http:") return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  // A private-use scheme, as installed apps use. Must be a real scheme, not "javascript:".
  return /^[a-z][a-z0-9+.-]*:$/.test(u.protocol) && !["javascript:", "data:", "vbscript:", "file:"].includes(u.protocol);
}

function toClient(d: ClientDef): OAuthClient | null {
  const clientId = (d.clientId ?? "").trim();
  const name = (d.name ?? "").trim();
  if (!clientId || !name) return null;

  const type = d.type === "confidential" ? "confidential" : "public";
  const redirectUris = (d.redirectUris ?? []).map((u) => u.trim()).filter(usableRedirect);
  if (!redirectUris.length) return null;

  const allowedScopes = (d.allowedScopes ?? []).filter(isScope);
  // Every client gets `openid` — without it there is nothing to sign in with.
  if (!allowedScopes.includes("openid")) allowedScopes.unshift("openid");

  // A confidential client with no secret hash cannot authenticate, so it would be a public client
  // wearing the wrong label. Refuse it rather than quietly downgrading its guarantees.
  if (type === "confidential" && !d.secretHash) return null;

  return {
    clientId,
    name,
    type,
    secretHash: d.secretHash || undefined,
    redirectUris,
    allowedScopes,
    trusted: !!d.trusted,
    homepage: d.homepage || undefined,
    active: d.active !== false,
  };
}

/** An approved, active partner client, in the same shape a CMS entry becomes. Pending and
 * rejected ones are invisible here — they cannot sign anyone in until a reviewer approves them. */
function fromPartnerClient(p: PartnerClient): OAuthClient | null {
  if (p.status !== "approved" || !p.active) return null;
  return {
    clientId: p.clientId,
    name: p.name,
    type: p.type,
    secretHash: p.secretHash,
    redirectUris: p.redirectUris,
    allowedScopes: p.allowedScopes,
    trusted: false,
    homepage: p.homepage,
    active: true,
  };
}

export async function listClients(cms: CmsClient, store?: AccountsStore): Promise<OAuthClient[]> {
  const entries = (await cms.content("oauth-clients")).entries as ClientDef[];
  const trusted = entries.map(toClient).filter((c): c is OAuthClient => !!c);
  if (!store) return trusted;
  const partners = (await store.listPartnerClients({ status: "approved" })).map(fromPartnerClient).filter((c): c is OAuthClient => !!c);
  return [...trusted, ...partners];
}

/** The active client with this id, or null. An inactive client is treated as absent. */
export async function getClient(cms: CmsClient, clientId: string, store?: AccountsStore): Promise<OAuthClient | null> {
  if (!clientId) return null;
  return (await listClients(cms, store)).find((c) => c.clientId === clientId && c.active) ?? null;
}

/**
 * Exact match, by design.
 *
 * Prefix and wildcard matching on redirect URIs is how authorization codes get delivered to the
 * wrong place; an open redirect anywhere under a permitted prefix becomes a token thief.
 */
export const redirectAllowed = (client: OAuthClient, uri: string) => client.redirectUris.includes(uri);

/** The scopes a client may actually have, given what it asked for. Unknown scopes are an error. */
export function resolveScopes(client: OAuthClient, requested: string[]): { scopes: Scope[]; rejected: string[] } {
  const rejected: string[] = [];
  const scopes: Scope[] = [];
  for (const r of requested) {
    if (!isScope(r) || !client.allowedScopes.includes(r)) rejected.push(r);
    else if (!scopes.includes(r)) scopes.push(r);
  }
  return { scopes, rejected };
}

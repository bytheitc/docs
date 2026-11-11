// Sign-in and account linking after a provider has confirmed who someone is.
import { randomUUID } from "node:crypto";
import type { ProviderProfile } from "../providers/types.js";
import { startContributorSession, type IssuedSession } from "./session.js";
import { requirePortalStore } from "./store.js";
import { AccountTakenError, DEFAULT_PROFILE, type Contributor, type LinkedAccount } from "./types.js";
import { handleFrom } from "./util.js";

/** `session` is set when a new session was started: the web puts its token in its own cookie. */
export type SignInResult =
  | { ok: true; to: string; session?: IssuedSession }
  | { ok: false; error: "taken" | "disabled" };

/** Only same-site relative paths are allowed as post-sign-in destinations. */
export function safeNext(v: string | null | undefined, fallback = "/dashboard"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.length > 500) return fallback;
  return v;
}

async function uniqueHandle(base: string): Promise<string> {
  const store = requirePortalStore();
  const root = handleFrom(base);
  for (let i = 1; i < 50; i++) {
    const h = i === 1 ? root : `${root.slice(0, 26)}-${i}`;
    if (!(await store.getContributorByHandle(h))) return h;
  }
  return `${root.slice(0, 20)}-${randomUUID().slice(0, 8)}`;
}

const accountOf = (contributorId: string, provider: string, p: ProviderProfile): LinkedAccount => ({
  contributorId, provider, providerUserId: p.providerUserId, username: p.username, displayName: p.displayName,
  avatarUrl: p.avatarUrl, profileUrl: p.profileUrl, linkedAt: new Date(),
});

/**
 * Finds or creates the contributor for (provider, providerUserId) and signs them in, or, when `me` is
 * the contributor already signed in on the web, links this identity to them. An identity linked to
 * someone else is never moved.
 */
export async function signInOrLink(provider: string, profile: ProviderProfile, next: string, me: Contributor | null): Promise<SignInResult> {
  const store = requirePortalStore();
  const existing = await store.getAccount(provider, profile.providerUserId);
  const author = { id: profile.providerUserId, username: profile.username };

  if (me) {
    if (existing && existing.contributorId !== me.id) return { ok: false, error: "taken" };
    try {
      await store.linkAccount(accountOf(me.id, provider, profile));
    } catch (e) {
      if (e instanceof AccountTakenError) return { ok: false, error: "taken" };
      throw e;
    }
    await store.attachContributions(provider, author, me.id);
    return { ok: true, to: next !== "/dashboard" ? next : `/dashboard/connections?linked=${encodeURIComponent(provider)}` };
  }

  if (existing) {
    const c = await store.getContributor(existing.contributorId);
    if (!c) return { ok: false, error: "disabled" };
    if (c.disabled) return { ok: false, error: "disabled" };
    await store.linkAccount(accountOf(c.id, provider, profile)); // refresh username/avatar
    return { ok: true, to: next, session: await startContributorSession(c.id) };
  }

  const c: Contributor = {
    id: randomUUID(), handle: await uniqueHandle(profile.username), displayName: profile.displayName || profile.username,
    avatarUrl: profile.avatarUrl, profile: { ...DEFAULT_PROFILE }, createdAt: new Date(),
  };
  await store.createContributor(c);
  try {
    await store.linkAccount(accountOf(c.id, provider, profile));
  } catch (e) {
    await store.deleteContributor(c.id); // lost a race with a parallel sign-in of the same identity
    if (e instanceof AccountTakenError) return signInOrLink(provider, profile, next, me);
    throw e;
  }
  await store.attachContributions(provider, author, c.id);
  return { ok: true, to: next === "/dashboard" ? "/dashboard?welcome=1" : next, session: await startContributorSession(c.id) };
}

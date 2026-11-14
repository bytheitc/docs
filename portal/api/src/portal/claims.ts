// Handing back a claim you are holding. A pure function of a store, so it tests without a database.
//
// Claiming an issue is a promise to the rest of the Collective that you are on it. Until now that
// promise could only be broken by waiting: a claim ran its course and expired, and only a maintainer
// or a steward could end one early. That left the honest case — "I can't get to this after all" —
// with nothing to do but go quiet, which is the opposite of what the claim is for.
import type { Claim, PortalStore } from "./types.js";

export type ReleaseOutcome =
  | { ok: true; claim: Claim }
  /** No active claim of theirs with that id. Deliberately not distinguished from "not yours". */
  | { ok: false; reason: "not-found" }
  /** It was theirs and active a moment ago, but expired or was released in between. */
  | { ok: false; reason: "no-longer-active" };

/**
 * Release a claim the contributor holds themselves.
 *
 * Whether the claim belongs to someone else, or does not exist at all, both answer `not-found`.
 * A contributor has no business learning which claim ids exist, and "forbidden" would tell them.
 * Releasing someone else's claim remains a maintainer's job, in `routes/maintainers.ts`.
 */
export async function releaseOwnClaim(
  store: PortalStore,
  contributor: { id: string; handle: string },
  claimId: string,
): Promise<ReleaseOutcome> {
  const mine = await store.listClaims({ contributorId: contributor.id, status: "active" });
  const claim = mine.find((c) => c.id === claimId);
  if (!claim) return { ok: false, reason: "not-found" };

  // The store releases only a row that is still active, so a claim that expired or was released
  // between the read above and this write comes back null instead of being released twice.
  const released = await store.releaseClaim(claim.id, contributor.handle);
  if (!released) return { ok: false, reason: "no-longer-active" };

  await store.addAudit({
    at: new Date(),
    actor: contributor.handle,
    action: "portal.claim.release",
    target: `claim/${claim.provider}:${claim.repo}#${claim.issue}`,
    detail: "released by the holder",
  });
  return { ok: true, claim: released };
}

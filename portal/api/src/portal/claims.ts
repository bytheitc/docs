// Claims: who may take an issue straight away, asking for one, a maintainer's answer, and handing
// one back. Pure functions of a store, so they test without a database.
//
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
  // A pending request can be withdrawn the same way as an active claim is released.
  const mine = (await store.listClaims({ contributorId: contributor.id })).filter((c) => c.status === "active" || c.status === "requested");
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


/* ------------------------------------------------------------------ */
/* Who may claim outright, and who has to ask                         */
/* ------------------------------------------------------------------ */
//
// GitHub only lets people with triage access assign themselves, and the portal's claim is how
// everyone else does it. So a claim from someone the collective doesn't know yet is a request: it
// holds the issue (no one else can take it meanwhile) and appears on the maintainers' claims page,
// but nothing is assigned on GitHub until a maintainer approves it. Someone who has had work merged,
// or who maintains or reviews a repository, has shown they finish what they start, and claims outright.

/** True when this person may claim without asking: merged work on record, or a maintainer/reviewer role. */
export async function isEstablished(store: PortalStore, contributorId: string): Promise<boolean> {
  const roles = await store.listMaintainerships({ contributorId });
  if (roles.some((m) => m.role === "maintainer" || m.role === "reviewer")) return true;
  const work = await store.listContributions({ contributorId, limit: 500 });
  return work.some((c) => c.state === "merged");
}

/** What the portal says on the GitHub issue. Plain words; the portal link lets people act on it. */
export const claimComments = {
  claimed: (login: string, until: string) =>
    `@${login} is working on this, claimed through the [ITC contributor portal](${PORTAL_LINK()}) until ${until}. ` +
    "If you'd like to help too, say so here first.",
  requested: (login: string) =>
    `@${login} has asked to work on this, through the [ITC contributor portal](${PORTAL_LINK()}). ` +
    "It's held for them while a maintainer reviews the request on the portal's claims page.",
  approved: (login: string, until: string, by: string) =>
    `@${by} approved the request: this is now @${login}'s, until ${until}.`,
  declined: (login: string, by: string) =>
    `@${by} declined @${login}'s request, so this issue is open again.`,
};

const PORTAL_LINK = () => (process.env.WEB_URL || "https://portal.bytheitc.xyz").replace(/\/+$/, "");

export type DecideOutcome =
  | { ok: true; claim: Claim }
  | { ok: false; reason: "not-found" | "not-pending" };

/** A maintainer's answer to a pending request. The route has already checked they maintain the repo. */
export async function decideRequest(
  store: PortalStore,
  maintainer: { id: string; handle: string },
  claimId: string,
  decision: "approve" | "decline",
  claimDays: number,
  now = new Date(),
): Promise<DecideOutcome> {
  const claim = (await store.listClaims({ status: "requested" })).find((c) => c.id === claimId);
  if (!claim) {
    const any = (await store.listClaims()).some((c) => c.id === claimId);
    return { ok: false, reason: any ? "not-pending" : "not-found" };
  }
  const result = decision === "approve"
    ? await store.approveClaim(claim.id, maintainer.handle, new Date(now.getTime() + claimDays * 864e5))
    : await store.declineClaim(claim.id, maintainer.handle);
  if (!result) return { ok: false, reason: "not-pending" };
  await store.addAudit({
    at: now,
    actor: maintainer.handle,
    action: decision === "approve" ? "maintainers.claim.approve" : "maintainers.claim.decline",
    target: `claim/${claim.provider}:${claim.repo}#${claim.issue}`,
    detail: claim.username,
  });
  return { ok: true, claim: result };
}

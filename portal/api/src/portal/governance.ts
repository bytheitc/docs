// The two rules on the governance page that are dates rather than decisions. They are pure functions
// of a store and a clock, so the tests can run them without a database or a timer.
import { randomUUID } from "node:crypto";
import { INACTIVE_MONTHS } from "./maintainers.js";
import type { PortalStore } from "./types.js";

/** Six months, as days. Months vary; the rule is about neglect, not calendars. */
export const INACTIVE_DAYS = INACTIVE_MONTHS * 30;

/**
 * "Existing maintainers of the repo have seven days to object. No objection means you're in."
 *
 * A nomination therefore carries by silence: nobody has to remember to approve it, and nobody can
 * quietly sit on one. An objection recorded at any point before the window closed stops it.
 */
export async function carryDueNominations(store: PortalStore, now: Date): Promise<number> {
  let carried = 0;
  for (const nomination of await store.dueNominations(now)) {
    if (nomination.objections.length) continue;
    await store.updateNomination(nomination.id, { status: "carried", decidedAt: now });
    await store.addMaintainership({
      id: randomUUID(), contributorId: nomination.candidateId, repo: nomination.repo,
      provider: nomination.provider, role: "maintainer", since: now, by: nomination.nominatedBy,
    });
    const who = await store.getContributor(nomination.candidateId);
    await store.addAudit({
      at: now, actor: "system", action: "maintainers.carried", target: nomination.repo,
      detail: `${who?.handle ?? nomination.candidateId}: seven days passed with no objection`,
    });
    carried++;
  }
  return carried;
}

/**
 * "Maintainers who are inactive for six months are moved to emeritus with thanks."
 *
 * Inactivity is work on that repo, not signing in: someone who reviews without committing is still
 * carrying the repo, and this rule can only see what the providers report. Emeritus ends nothing a
 * person cannot undo — "coming back is one message away" — so nothing here is irreversible.
 */
export async function retireInactive(store: PortalStore, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 864e5);
  let retired = 0;
  for (const row of await store.staleMaintainerships(cutoff)) {
    const last = await store.lastContributionAt(row.contributorId, row.repo);
    if (last && last > cutoff) continue;
    await store.endMaintainership(row.id, { endedAt: now, endedReason: "emeritus" });
    const who = await store.getContributor(row.contributorId);
    await store.addAudit({
      at: now, actor: "system", action: "maintainers.emeritus", target: row.repo,
      detail: `${who?.handle ?? row.contributorId}: with thanks, after ${INACTIVE_MONTHS} months`,
    });
    retired++;
  }
  return retired;
}

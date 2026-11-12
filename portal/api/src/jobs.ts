// Work this api does on its own clock, with nothing to trigger it from outside.
//
//   CLAIM_SWEEP_MINUTES       how often to release claims past their date (15; 0 switches it off)
//   SYNC_INTERVAL_MINUTES     how often to sync every active source (0 = off, the default)
//   GOVERNANCE_SWEEP_MINUTES  how often to close nominations whose seven days are up, and to move
//                             maintainers inactive for six months to emeritus (60; 0 = off)
//
// Both run in this process. One instance should run them; set both to 0 on the others.
//
// A released claim is not emailed to anyone: the portal deliberately holds no contributor's email
// address (see ProviderProfile — id, username, display name and avatar, nothing more). People see
// it on their dashboard instead, which is the price of not collecting what we do not need.
import type { CmsClient } from "./cms.js";
import type { Config } from "./config.js";
import { getSources } from "./portal/content.js";
import { carryDueNominations, retireInactive } from "./portal/governance.js";
import { getPortalStore } from "./portal/store.js";
import { syncSource } from "./portal/sync.js";

export interface Jobs {
  stop(): void;
  /** Runs the claim sweep once, now. Exposed so a staff page and the tests can call it. */
  sweepClaims(): Promise<number>;
  /** Closes nominations whose window has passed, and retires inactive maintainers. */
  sweepGovernance(): Promise<{ carried: number; retired: number }>;
}

/** Runs `work` every `everyMs`, never twice at once, and never letting a failure stop the timer. */
function repeat(name: string, everyMs: number, work: () => Promise<void>): NodeJS.Timeout | null {
  if (everyMs <= 0) return null;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await work();
    } catch (e) {
      console.error(`[api] job "${name}" failed: ${(e as Error).message}`);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), everyMs);
  timer.unref();
  return timer;
}

export function startJobs(config: Config, cms: CmsClient): Jobs {
  const sweepClaims = async (): Promise<number> => {
    const store = getPortalStore();
    if (!store) return 0;
    const expired = await store.expireClaims();
    for (const claim of expired) {
      await store.addAudit({
        at: new Date(), actor: "system", action: "portal.claim.expire",
        target: `claim/${claim.provider}:${claim.repo}#${claim.issue}`, detail: claim.username,
      });
    }
    if (expired.length) console.log(`[api] released ${expired.length} expired claim(s).`);
    return expired.length;
  };

  const runSync = async () => {
    const store = getPortalStore();
    if (!store) return;
    const sources = (await getSources(cms)).filter((s) => s.active);
    if (!sources.length) return;
    console.log(`[api] scheduled sync: ${sources.length} active source(s).`);
    for (const source of sources) {
      const run = await syncSource(source, "system");
      if (run.status === "error") console.error(`[api] sync ${source.id} failed: ${run.errors.join("; ")}`);
    }
  };

  const sweepGovernance = async (): Promise<{ carried: number; retired: number }> => {
    const store = getPortalStore();
    if (!store) return { carried: 0, retired: 0 };
    const now = new Date();
    const carried = await carryDueNominations(store, now);
    const retired = await retireInactive(store, now);
    if (carried || retired) console.log(`[api] governance sweep: ${carried} nomination(s) carried, ${retired} moved to emeritus.`);
    return { carried, retired };
  };

  const timers = [
    repeat("claim-sweep", config.jobs.claimSweepMs, async () => void (await sweepClaims())),
    repeat("sync", config.jobs.syncIntervalMs, runSync),
    repeat("governance", config.jobs.governanceSweepMs, async () => void (await sweepGovernance())),
  ].filter((t): t is NodeJS.Timeout => t !== null);

  if (config.jobs.claimSweepMs > 0) {
    // Catch up on anything that expired while this api was down, a few seconds after boot.
    setTimeout(() => void sweepClaims().catch(() => {}), 5_000).unref();
  }
  console.log(
    `[api] jobs: claim sweep ${config.jobs.claimSweepMs ? `every ${config.jobs.claimSweepMs / 60_000} min` : "off"}, ` +
    `sync ${config.jobs.syncIntervalMs ? `every ${config.jobs.syncIntervalMs / 60_000} min` : "off"}, ` +
    `governance ${config.jobs.governanceSweepMs ? `every ${config.jobs.governanceSweepMs / 60_000} min` : "off"}.`,
  );

  return { stop: () => timers.forEach(clearInterval), sweepClaims, sweepGovernance };
}

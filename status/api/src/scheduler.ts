// The clock. Probes every service on an interval, rolls results into day buckets, prunes old probes.
//
// Checks are staggered rather than fired together: a hundred services on one interval is a
// thundering herd that makes the thing you are watching look slow because you are watching it.
import type { Config } from "./config.js";
import { runCheck, toResult } from "./checks.js";
import { getStore } from "./store/index.js";
import type { Service } from "./types.js";

export interface Scheduler {
  stop(): void;
  /** Probe everything once, now. Used at boot, by the admin api and by the tests. */
  runAll(): Promise<{ checked: number; down: number }>;
}

export function startScheduler(config: Config): Scheduler {
  const timers: NodeJS.Timeout[] = [];

  const probe = async (s: Service): Promise<boolean> => {
    const store = getStore();
    if (!store) return false;
    const result = toResult(s.id, s.tenantId, await runCheck(s.check));
    try {
      await store.recordResult(result);
    } catch (e) {
      // Losing a probe is not worth taking the process down for.
      console.error(`[status] could not record a result for ${s.id}: ${(e as Error).message}`);
    }
    return result.state === "down";
  };

  const runAll = async (): Promise<{ checked: number; down: number }> => {
    const store = getStore();
    if (!store) return { checked: 0, down: 0 };
    const services = await store.listAllServices();
    if (!services.length) return { checked: 0, down: 0 };

    // Spread the batch across the interval, leaving headroom so a slow check cannot overlap the
    // next sweep. With checking switched off, run them together: it is a one-off.
    const span = config.checkIntervalMs ? config.checkIntervalMs * 0.8 : 0;
    const gap = services.length > 1 ? span / services.length : 0;

    const results = await Promise.all(
      services.map(
        (s, i) =>
          new Promise<boolean>((resolve) => {
            const t = setTimeout(() => void probe(s).then(resolve), Math.round(i * gap));
            t.unref();
          }),
      ),
    );
    return { checked: services.length, down: results.filter(Boolean).length };
  };

  const every = (ms: number, label: string, fn: () => Promise<unknown>) => {
    if (ms <= 0) return;
    const t = setInterval(() => {
      void fn().catch((e) => console.error(`[status] ${label} failed: ${(e as Error).message}`));
    }, ms);
    t.unref();
    timers.push(t);
  };

  every(config.checkIntervalMs, "check sweep", runAll);

  // Individual probes are only needed for "what is the state right now" and the recent graph; the
  // day buckets carry the long history, so the raw rows are dropped on a daily sweep.
  every(6 * 3600_000, "prune", async () => {
    const store = getStore();
    if (!store) return;
    const removed = await store.prune(new Date(Date.now() - config.pruneDays * 864e5));
    if (removed) console.log(`[status] pruned ${removed} probe(s) older than ${config.pruneDays} days.`);
  });

  // Something has to populate the page before the first interval elapses.
  if (config.checkIntervalMs > 0) {
    const t = setTimeout(() => void runAll().catch(() => {}), 1500);
    t.unref();
  }

  console.log(
    `[status] checks ${config.checkIntervalMs ? `every ${config.checkIntervalMs / 1000}s` : "off"}, ` +
    `keeping ${config.pruneDays} days of probes.`,
  );

  return { stop: () => timers.forEach(clearInterval), runAll };
}

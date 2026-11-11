// Contribution sync: runs a provider adapter against a tracked source with org-level credentials from the
// environment, upserts by (provider, providerContributionId), and attaches work to contributors through their
// linked accounts. Unmatched work is kept and attaches when someone links that account later.
import { randomUUID } from "node:crypto";
import { knownProvider } from "@/lib/providers";
import type { FetchLike, NormalisedContribution, TrackedSource } from "@/lib/providers/types";
import { requirePortalStore } from "@/lib/portal/store";
import { matcher } from "@/lib/portal/match";
import type { SyncRun } from "@/lib/portal/types";

/** Overlap with the last run so edits near the boundary aren't missed. */
const OVERLAP_MS = 24 * 3600e3;

export function toStored(c: NormalisedContribution, sourceId: string) {
  return {
    provider: c.provider, providerContributionId: c.providerContributionId, kind: c.kind, title: c.title, url: c.url,
    repo: c.repo, state: c.state, house: c.house, occurredAt: c.occurredAt,
    authorId: c.author.id, authorUsername: c.author.username, sourceId,
  };
}

export async function syncSource(source: TrackedSource, by: string | null, fetchImpl: FetchLike = fetch): Promise<SyncRun> {
  const store = requirePortalStore();
  const run: SyncRun = {
    id: randomUUID(), sourceId: source.id, provider: source.provider, startedAt: new Date(), status: "running",
    counts: { fetched: 0, created: 0, updated: 0, matched: 0 }, errors: [], by,
  };
  await store.addSyncRun(run);
  try {
    const adapter = knownProvider(source.provider);
    if (!adapter?.sync) throw new Error(`Provider “${source.provider}” has no sync.`);
    if (!source.owner && !adapter.ownerOptional) throw new Error("This source needs an owner.");
    const last = await store.lastSuccessfulRun(source.id);
    const since = last ? new Date(last.startedAt.getTime() - OVERLAP_MS) : null;
    const accounts = await store.listAccountsByProvider(source.provider);
    const items = await adapter.sync(source, since, {
      fetch: fetchImpl,
      env: process.env as Record<string, string | undefined>,
      linkedAccounts: accounts.map((a) => ({ providerUserId: a.providerUserId, username: a.username })),
    });
    run.counts.fetched = items.length;
    const r = await store.upsertContributions(items.map((c) => toStored(c, source.id)), matcher(accounts));
    run.counts = { fetched: items.length, ...r };
    run.status = "ok";
  } catch (e) {
    run.status = "error";
    run.errors.push((e as Error).message.slice(0, 500));
  }
  run.finishedAt = new Date();
  await store.updateSyncRun(run.id, { status: run.status, counts: run.counts, errors: run.errors, finishedAt: run.finishedAt });
  return run;
}

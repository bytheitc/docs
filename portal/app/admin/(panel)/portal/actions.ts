"use server";
// Portal admin actions. House-specific (not part of the CMS kit). Each re-checks the staff user's role
// with the kit's requireUser, and writes to the kit's audit log.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/cms/auth";
import { requireStorage } from "@/lib/cms/storage";
import type { User } from "@/lib/cms/types";
import { getSources } from "@/lib/data";
import { syncSource } from "@/lib/portal/sync";
import { requirePortalStore } from "@/lib/portal/store";

const s = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

async function audit(actor: User, action: string, target?: string, detail?: string) {
  await requireStorage().addAudit({ at: new Date(), actor: actor.email, action, target, detail });
}

/** Verify or decline a self-logged contribution (publishers). */
export async function reviewContribution(fd: FormData) {
  const user = await requireUser("publisher");
  const id = s(fd, "id", 80), decision = s(fd, "decision", 20), note = s(fd, "note", 500);
  if (decision !== "verified" && decision !== "declined") throw new Error("Unknown decision.");
  const store = requirePortalStore();
  const c = await store.getContribution(id);
  if (!c || c.provider !== "self") throw new Error("Only self-logged contributions are reviewed.");
  await store.updateContribution(id, { review: { status: decision, by: user.email, at: new Date(), note: note || undefined } });
  await audit(user, `portal.contribution.${decision}`, `contribution/${id}`, c.title.slice(0, 120));
  revalidatePath("/admin/portal", "layout");
  revalidatePath("/dashboard", "layout");
}

/** Hide or unhide any contribution (publishers). Hidden work is left out of dashboards, profiles and milestones. */
export async function setHidden(fd: FormData) {
  const user = await requireUser("publisher");
  const id = s(fd, "id", 80), hidden = s(fd, "hidden", 5) === "true";
  const store = requirePortalStore();
  const c = await store.getContribution(id);
  if (!c) throw new Error("Contribution not found.");
  await store.updateContribution(id, { hidden });
  await audit(user, hidden ? "portal.contribution.hide" : "portal.contribution.unhide", `contribution/${id}`, c.title.slice(0, 120));
  revalidatePath("/admin/portal", "layout");
  revalidatePath("/dashboard", "layout");
}

/** Disable or re-enable a contributor (admins). Disabling signs them out everywhere. */
export async function setContributorDisabled(fd: FormData) {
  const user = await requireUser("admin");
  const id = s(fd, "id", 80), disabled = s(fd, "disabled", 5) === "true";
  const store = requirePortalStore();
  const c = await store.getContributor(id);
  if (!c) throw new Error("Contributor not found.");
  await store.updateContributor(id, { disabled });
  if (disabled) await store.deleteSessions(id);
  await audit(user, disabled ? "portal.contributor.disable" : "portal.contributor.enable", `contributor/${c.handle}`);
  revalidatePath("/admin/portal", "layout");
  revalidatePath("/contributors");
}

/** Release an active claim (publishers). */
export async function releaseClaim(fd: FormData) {
  const user = await requireUser("publisher");
  const id = s(fd, "id", 80);
  const claim = await requirePortalStore().releaseClaim(id, user.email);
  if (claim) await audit(user, "portal.claim.release", `claim/${claim.provider}:${claim.repo}#${claim.issue}`, claim.username);
  revalidatePath("/admin/portal/claims");
}

/** Sync one source, or every active source (publishers). Runs inline and records a run per source. */
export async function runSync(fd: FormData) {
  const user = await requireUser("publisher");
  const which = s(fd, "source", 100);
  const sources = (await getSources()).filter((x) => (which === "__all" ? x.active : x.id === which));
  if (!sources.length) throw new Error(which === "__all" ? "No active sources." : "Source not found or not published.");
  const results = [];
  for (const src of sources) results.push(await syncSource(src, user.email));
  const summary = results.map((r) => `${r.sourceId}: ${r.status} (${r.counts.fetched} fetched, ${r.counts.created} new, ${r.counts.matched} matched)`).join("; ");
  await audit(user, "portal.sync.run", which === "__all" ? "all sources" : `source/${which}`, summary.slice(0, 500));
  revalidatePath("/admin/portal", "layout");
}

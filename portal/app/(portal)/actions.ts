"use server";
// Contributor-facing server actions. Each re-checks the session; Next server actions are POST-only and
// origin-checked, which is the CSRF guard for everything here.
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordSubmission } from "@/lib/cms/submit";
import { getSettings } from "@/lib/data";
import { knownProvider } from "@/lib/providers";
import { assignGithubIssue } from "@/lib/providers/github";
import { currentContributor, endContributorSession, requireContributor } from "@/lib/portal/session";
import { requirePortalStore } from "@/lib/portal/store";
import { ClaimTakenError, type Claim, type PublicProfile } from "@/lib/portal/types";
import { HANDLE, httpUrl, isHouse, SELF_KINDS } from "@/lib/portal/util";

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const on = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/* ---------------- sessions and accounts ---------------- */

export async function signOut() {
  await endContributorSession();
  redirect("/");
}

export async function signOutEverywhere() {
  const me = await currentContributor();
  if (me) await requirePortalStore().deleteSessions(me.id);
  await endContributorSession();
  redirect("/sign-in?signedout=all");
}

export async function unlinkAccount(fd: FormData) {
  const me = await requireContributor("/dashboard/connections");
  const store = requirePortalStore();
  const provider = s(fd, "provider", 40), providerUserId = s(fd, "providerUserId", 200);
  const accounts = await store.listAccounts(me.id);
  const target = accounts.find((a) => a.provider === provider && a.providerUserId === providerUserId);
  if (!target) redirect("/dashboard/connections");
  if (accounts.length <= 1) redirect("/dashboard/connections?error=last");
  await store.unlinkAccount(me.id, provider, providerUserId);
  await store.detachContributions(provider, { id: target.providerUserId, username: target.username }, me.id);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/connections?unlinked=${encodeURIComponent(provider)}`);
}

/* ---------------- self-logged contributions ---------------- */

export async function logContribution(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireContributor("/dashboard/log");
  const title = s(fd, "title", 200), description = s(fd, "description", 2000), kind = s(fd, "kind", 40);
  const house = s(fd, "house", 40), link = s(fd, "url", 500), date = s(fd, "date", 10);
  const errors: Record<string, string> = {};
  if (title.length < 3) errors.title = "Give it a short title.";
  if (!(SELF_KINDS as readonly string[]).includes(kind)) errors.kind = "Choose what kind of work this was.";
  if (!isHouse(house)) errors.house = "Choose the house it was for.";
  const url = link ? httpUrl(link) : null;
  if (!link) errors.url = "Add a link where a steward can see the work.";
  else if (!url) errors.url = "Use a full link starting with https://";
  if (description.length < 10) errors.description = "Describe what you did in a sentence or two.";
  const when = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : null;
  if (!when || isNaN(+when) || when > new Date(Date.now() + 864e5)) errors.date = "Enter the date (not in the future).";
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted fields." };

  const id = randomUUID(), now = new Date();
  await requirePortalStore().addContribution({
    id, provider: "self", providerContributionId: id, kind: kind as (typeof SELF_KINDS)[number], title, url: url!,
    state: "published", house: house as never, occurredAt: when!, contributorId: me.id, description,
    review: { status: "pending" }, createdAt: now, updatedAt: now,
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Logged. A steward will confirm it; you’ll see the status below." };
}

/* ---------------- public profile ---------------- */

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireContributor("/dashboard/profile");
  const store = requirePortalStore();
  const handle = s(fd, "handle", 40).toLowerCase(), displayName = s(fd, "displayName", 80);
  const bio = s(fd, "bio", 400), websiteRaw = s(fd, "website", 300);
  const errors: Record<string, string> = {};
  if (!HANDLE.test(handle)) errors.handle = "2–30 lowercase letters, digits or hyphens.";
  else if (handle !== me.handle && (await store.getContributorByHandle(handle))) errors.handle = "That handle is taken.";
  if (displayName.length < 1) errors.displayName = "Your name is required.";
  const website = websiteRaw ? httpUrl(websiteRaw) : "";
  if (website === null) errors.website = "Use a full link starting with https://";
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted fields." };

  const isPublic = on(fd, "public");
  const profile: PublicProfile = {
    public: isPublic, bio, website: website ?? "",
    showHouses: on(fd, "showHouses"), showAccounts: on(fd, "showAccounts"), showContributions: on(fd, "showContributions"),
    onWall: isPublic && on(fd, "onWall"),
  };
  try {
    await store.updateContributor(me.id, { handle, displayName, profile });
  } catch {
    return { errors: { handle: "That handle is taken." } };
  }
  revalidatePath("/contributors");
  revalidatePath(`/u/${me.handle}`);
  revalidatePath(`/u/${handle}`);
  return { ok: true, message: isPublic ? `Saved. Your profile is public at /u/${handle}.` : "Saved. Your profile is private." };
}

/* ---------------- your data ---------------- */

export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireContributor("/dashboard/data");
  if (s(fd, "confirm", 60) !== me.handle) return { errors: { confirm: `Type your handle, ${me.handle}, to confirm.` } };
  await requirePortalStore().deleteContributor(me.id);
  await endContributorSession();
  redirect("/?deleted=1");
}

/* ---------------- claims ---------------- */

const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const CLAIMABLE = ["github", "gitlab", "codeberg", "dev"];

export async function claimIssue(_: ActionState, fd: FormData): Promise<ActionState> {
  const provider = s(fd, "provider", 40), repo = s(fd, "repo", 201), issue = Number(s(fd, "issue", 12));
  const me = await requireContributor(`/claim?provider=${encodeURIComponent(provider)}&repo=${encodeURIComponent(repo)}&issue=${issue}`);
  if (!CLAIMABLE.includes(provider) || !knownProvider(provider)) return { message: "Issues on that platform can’t be claimed here." };
  if (!REPO.test(repo) || !Number.isInteger(issue) || issue < 1 || issue > 10_000_000) return { message: "That issue reference isn’t valid." };
  const store = requirePortalStore();
  const account = (await store.listAccounts(me.id)).find((a) => a.provider === provider);
  if (!account) return { message: `Link your ${knownProvider(provider)!.name} account first.` };

  const { claimDays } = await getSettings();
  const now = new Date();
  const claim: Claim = {
    id: randomUUID(), provider, repo, issue, contributorId: me.id, username: account.username, status: "active",
    createdAt: now, expiresAt: new Date(now.getTime() + claimDays * 864e5), assigned: false,
  };
  try {
    await store.createClaim(claim);
  } catch (e) {
    if (e instanceof ClaimTakenError) return { message: "Someone is already working on this issue. Try another, or check back after their claim expires." };
    throw e;
  }

  let assigned = false;
  if (provider === "github") {
    try {
      assigned = await assignGithubIssue(fetch, process.env as Record<string, string | undefined>, repo, issue, account.username);
    } catch {
      assigned = false;
    }
  }
  if (assigned) {
    await store.markClaimAssigned(claim.id);
  } else {
    // No write access configured: a steward assigns it by hand.
    await recordSubmission("issue-claim", {
      provider, repo, issue: String(issue), username: account.username, contributor: me.handle,
      expires: claim.expiresAt.toISOString().slice(0, 10),
    });
  }
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: assigned
      ? `Claimed and assigned to you on GitHub until ${claim.expiresAt.toLocaleDateString("en-GB")}.`
      : `Claimed until ${claim.expiresAt.toLocaleDateString("en-GB")}. A steward will assign it to ${account.username}.`,
  };
}

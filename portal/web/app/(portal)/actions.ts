"use server";
// Contributor-facing server actions. Each one carries this browser's session token to portal/api,
// which re-checks it; Next server actions are POST-only and origin-checked, which is the CSRF guard.
// No validation lives here that the api doesn't repeat: this side only shapes the answer for the UI.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/portal";
import { clearSessionCookie, requireContributor, sessionToken } from "@/lib/session";

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const on = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/* ---------------- sessions and accounts ---------------- */

export async function signOut() {
  await api.signOut(await sessionToken());
  await clearSessionCookie();
  redirect("/");
}

export async function signOutEverywhere() {
  await api.signOutEverywhere(await sessionToken());
  await clearSessionCookie();
  redirect("/sign-in?signedout=all");
}

export async function unlinkAccount(fd: FormData) {
  await requireContributor("/dashboard/connections");
  const provider = s(fd, "provider", 40);
  const result = await api.unlinkAccount((await sessionToken())!, provider, s(fd, "providerUserId", 200));
  if (!result.ok) {
    // The api refuses to unlink the last identity: there would be no way back in.
    redirect(`/dashboard/connections?error=${result.errors?.account === "last" ? "last" : "unlink"}`);
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/connections?unlinked=${encodeURIComponent(provider)}`);
}

/* ---------------- self-logged contributions ---------------- */

export async function logContribution(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireContributor("/dashboard/log");
  const result = await api.logContribution((await sessionToken())!, {
    title: s(fd, "title", 200), description: s(fd, "description", 2000), kind: s(fd, "kind", 40),
    house: s(fd, "house", 40), url: s(fd, "url", 500), date: s(fd, "date", 10),
  });
  if (!result.ok) return { errors: result.errors, message: result.message };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Logged. A steward will confirm it; you’ll see the status below." };
}

/* ---------------- public profile ---------------- */

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireContributor("/dashboard/profile");
  const result = await api.updateProfile((await sessionToken())!, {
    handle: s(fd, "handle", 40).toLowerCase(), displayName: s(fd, "displayName", 80),
    bio: s(fd, "bio", 400), website: s(fd, "website", 300),
    public: on(fd, "public"), showHouses: on(fd, "showHouses"), showAccounts: on(fd, "showAccounts"),
    showContributions: on(fd, "showContributions"), onWall: on(fd, "onWall"),
  });
  if (!result.ok) return { errors: result.errors, message: result.message };
  revalidatePath("/contributors");
  revalidatePath(`/u/${me.handle}`);
  revalidatePath(`/u/${result.handle}`);
  return {
    ok: true,
    message: result.public ? `Saved. Your profile is public at /u/${result.handle}.` : "Saved. Your profile is private.",
  };
}

/* ---------------- your data ---------------- */

export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireContributor("/dashboard/data");
  const result = await api.deleteMe((await sessionToken())!, s(fd, "confirm", 60));
  if (!result.ok) return { errors: result.errors ?? { confirm: `Type your handle, ${me.handle}, to confirm.` }, message: result.message };
  await clearSessionCookie();
  redirect("/?deleted=1");
}

/* ---------------- claims ---------------- */

export async function claimIssue(_: ActionState, fd: FormData): Promise<ActionState> {
  const provider = s(fd, "provider", 40), repo = s(fd, "repo", 201), issue = Number(s(fd, "issue", 12));
  await requireContributor(`/claim?provider=${encodeURIComponent(provider)}&repo=${encodeURIComponent(repo)}&issue=${issue}`);
  const result = await api.claimIssue((await sessionToken())!, { provider, repo, issue });
  if (!result.ok) return { message: result.message };
  revalidatePath("/dashboard");
  const until = new Date(result.expiresAt).toLocaleDateString("en-GB");
  return {
    ok: true,
    message: result.assigned
      ? `Claimed and assigned to you on GitHub until ${until}.`
      : `Claimed until ${until}. A steward will assign it to ${result.username}.`,
  };
}

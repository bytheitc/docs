"use server";
// Staff actions. Each one carries the CMS session token to portal/api, which re-checks the account
// and its role before changing anything, and writes the change to the portal's audit log.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { staff, staffLogin } from "@/lib/portal";
import { clearStaffCookie, requireStaff, setStaffCookie } from "@/lib/staff-session";
import { safeNext } from "@/lib/util";

export interface StaffFormState {
  error?: string;
}

const s = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

/* ---------------- signing in ---------------- */

export async function signInStaff(_: StaffFormState, fd: FormData): Promise<StaffFormState> {
  const next = safeNext(s(fd, "next", 300), "/staff");
  // The password goes straight to portal/api, which asks the CMS. Nothing about it is kept here.
  const result = await staffLogin(s(fd, "email", 200), s(fd, "password", 200));
  if (!result.ok) return { error: result.message };
  await setStaffCookie(result.token, result.expiresAt);
  redirect(next);
}

export async function signOutStaff() {
  await clearStaffCookie();
  redirect("/staff/sign-in");
}

/* ---------------- contributors ---------------- */

export async function setContributorDisabled(fd: FormData) {
  const { token } = await requireStaff("/staff/contributors");
  await staff.setDisabled(token, s(fd, "id", 80), s(fd, "disabled", 5) === "true");
  revalidatePath("/staff", "layout");
  revalidatePath("/contributors");
}

/* ---------------- contributions ---------------- */

export async function reviewContribution(fd: FormData) {
  const { token } = await requireStaff("/staff/contributions");
  const decision = s(fd, "decision", 20);
  if (decision !== "verified" && decision !== "declined") return;
  await staff.review(token, s(fd, "id", 80), decision, s(fd, "note", 500) || undefined);
  revalidatePath("/staff", "layout");
}

export async function setHidden(fd: FormData) {
  const { token } = await requireStaff("/staff/contributions");
  await staff.setHidden(token, s(fd, "id", 80), s(fd, "hidden", 5) === "true");
  revalidatePath("/staff", "layout");
}

/* ---------------- claims and sync ---------------- */

export async function releaseClaim(fd: FormData) {
  const { token } = await requireStaff("/staff/claims");
  await staff.releaseClaim(token, s(fd, "id", 80));
  revalidatePath("/staff/claims");
}

export async function runSync(fd: FormData) {
  const { token } = await requireStaff("/staff/sync");
  // Runs inline and records one run per source; the api refuses unless you are a publisher.
  await staff.runSync(token, s(fd, "source", 100) || "__all");
  revalidatePath("/staff", "layout");
}

/* ---------------- maintainers ---------------- */

/**
 * Seats the first maintainers of a repository, and the steering group. Everything after that happens
 * between maintainers under /maintainers, as the governance page describes.
 */
export async function seatMaintainer(_: StaffFormState, fd: FormData): Promise<StaffFormState> {
  const { token } = await requireStaff("/staff/maintainers");
  const role = s(fd, "role", 20);
  const result = await staff.seatMaintainer(token, {
    handle: s(fd, "handle", 40), role, ...(role === "steering" ? {} : { repo: s(fd, "repo", 201) }),
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/staff", "layout");
  return {};
}

export async function unseatMaintainer(fd: FormData) {
  const { token } = await requireStaff("/staff/maintainers");
  await staff.unseatMaintainer(token, s(fd, "id", 80), s(fd, "note", 500));
  revalidatePath("/staff", "layout");
}

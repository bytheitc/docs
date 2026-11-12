"use server";
// Maintainer actions. Each carries this browser's session token to portal/api, which re-checks that
// the person may act as a maintainer of that repo before doing anything. Nothing is decided here.
import { revalidatePath } from "next/cache";
import * as api from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";

export interface MaintainerState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const token = async () => {
  await requireContributor("/maintainers");
  return (await sessionToken())!;
};
const refresh = () => {
  revalidatePath("/maintainers", "layout");
  revalidatePath("/dashboard", "layout");
};

export async function invite(_: MaintainerState, fd: FormData): Promise<MaintainerState> {
  const result = await api.inviteReviewer(await token(), {
    repo: s(fd, "repo", 201), handle: s(fd, "handle", 40), note: s(fd, "note", 1000),
  });
  if (!result.ok) return { message: result.message, errors: result.errors };
  refresh();
  return { ok: true, message: "Invitation sent. They'll see it on their maintainers page." };
}

export async function answerInvitation(fd: FormData) {
  await api.respondToInvitation(await token(), s(fd, "id", 80), s(fd, "accept", 5) === "true");
  refresh();
}

export async function cancelInvitation(fd: FormData) {
  await api.withdrawInvitation(await token(), s(fd, "id", 80));
  refresh();
}

export async function nominate(_: MaintainerState, fd: FormData): Promise<MaintainerState> {
  const result = await api.nominate(await token(), {
    repo: s(fd, "repo", 201), handle: s(fd, "handle", 40),
    issueUrl: s(fd, "issueUrl", 500), reason: s(fd, "reason", 2000),
  });
  if (!result.ok) return { message: result.message, errors: result.errors };
  refresh();
  return { ok: true, message: "Nominated. Unless a maintainer of this repo objects within seven days, it carries." };
}

export async function object(_: MaintainerState, fd: FormData): Promise<MaintainerState> {
  const note = s(fd, "note", 1000);
  if (note.length < 3) return { errors: { note: "Say why, so it can be answered in the issue." } };
  const result = await api.objectToNomination(await token(), s(fd, "id", 80), note);
  if (!result.ok) return { message: result.message };
  refresh();
  return { ok: true, message: "Objection recorded. The conversation continues in the issue." };
}

export async function cancelNomination(fd: FormData) {
  await api.withdrawNomination(await token(), s(fd, "id", 80));
  refresh();
}

export async function releaseClaim(fd: FormData) {
  await api.releaseClaimAsMaintainer(await token(), s(fd, "id", 80));
  revalidatePath("/maintainers/claims");
}

export async function stepDown(fd: FormData) {
  await api.stepDown(await token(), s(fd, "repo", 201));
  refresh();
}

export async function removeRights(_: MaintainerState, fd: FormData): Promise<MaintainerState> {
  const note = s(fd, "note", 1000);
  if (note.length < 3) return { errors: { note: "A reason is required, and it is kept in the audit log." } };
  const result = await api.removeMaintainer(await token(), s(fd, "id", 80), note);
  if (!result.ok) return { message: result.message };
  refresh();
  return { ok: true, message: "Rights removed." };
}

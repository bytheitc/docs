"use server";
// Password, TOTP and recovery-code management. Passkeys are handled separately
// (components/AddPasskeyButton.tsx): adding one needs the browser's own WebAuthn API, which a
// server action can't reach.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/accounts";
import { sessionToken } from "@/lib/session";

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  secret?: string;
  otpauthUrl?: string;
  recoveryCodes?: string[];
}

const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

async function requireToken(): Promise<string> {
  const token = await sessionToken();
  if (!token) redirect("/sign-in?next=/account/security");
  return token;
}

export async function removePasskey(fd: FormData) {
  const token = await requireToken();
  await api.deletePasskey(token, s(fd, "credentialId"));
  revalidatePath("/account/security");
}

export async function setPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = await requireToken();
  const password = s(fd, "password");
  const confirm = s(fd, "confirm");
  if (password !== confirm) return { errors: { confirm: "Doesn't match." }, message: "Those passwords don't match." };
  const result = await api.setPassword(token, password);
  if (!result.ok) return { errors: result.errors, message: result.message };
  revalidatePath("/account/security");
  return { ok: true, message: "Password set." };
}

export async function removePassword() {
  const token = await requireToken();
  await api.removePassword(token);
  revalidatePath("/account/security");
}

export async function enrollTotp(): Promise<ActionState> {
  const token = await requireToken();
  const result = await api.enrollTotp(token);
  if (!result.ok) return { message: result.message };
  return { ok: true, secret: result.secret, otpauthUrl: result.otpauthUrl };
}

export async function confirmTotp(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = await requireToken();
  const result = await api.confirmTotp(token, s(fd, "code", 10));
  if (!result.ok) return { errors: result.errors, message: result.message };
  revalidatePath("/account/security");
  return { ok: true, recoveryCodes: result.recoveryCodes, message: "Two-factor is on. Save these recovery codes somewhere safe — they won't be shown again." };
}

export async function disableTotp() {
  const token = await requireToken();
  await api.disableTotp(token);
  revalidatePath("/account/security");
}

export async function regenerateRecoveryCodes(): Promise<ActionState> {
  const token = await requireToken();
  const result = await api.regenerateRecoveryCodes(token);
  if (!result.ok) return { message: result.message };
  revalidatePath("/account/security");
  return { ok: true, recoveryCodes: result.recoveryCodes, message: "New recovery codes. The old ones no longer work." };
}

"use server";
// Account-facing server actions. Each one carries this browser's session token to accounts/api,
// which re-checks it; Next server actions are POST-only and origin-checked, which is the CSRF guard.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as api from "@/lib/accounts";
import { clearSessionCookie, sessionToken } from "@/lib/session";

export async function signOut() {
  await api.signOut(await sessionToken());
  await clearSessionCookie();
  redirect("/sign-in");
}

export async function signOutEverywhere() {
  await api.signOutEverywhere(await sessionToken());
  await clearSessionCookie();
  redirect("/sign-in?signedout=all");
}

export async function disconnectApp(fd: FormData) {
  const token = await sessionToken();
  if (!token) redirect("/sign-in?next=/account");
  await api.revokeGrant(String(fd.get("clientId") ?? ""), token);
  revalidatePath("/account");
}

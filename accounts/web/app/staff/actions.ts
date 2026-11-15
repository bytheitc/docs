"use server";
// Staff-facing server actions: signing in to review, and approving or rejecting a partner's app.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as api from "@/lib/accounts";
import { clearStaffCookie, requireStaff, setStaffCookie } from "@/lib/staff-session";
import { safeNext } from "@/lib/util";

export interface StaffFormState {
  error?: string;
}

export async function signInStaff(_: StaffFormState, fd: FormData): Promise<StaffFormState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(String(fd.get("next") ?? ""), "/staff/partner-apps");
  const result = await api.staffLogin(email, password);
  if (!result.ok) return { error: result.message };
  await setStaffCookie(result.token, result.expiresAt);
  redirect(next);
}

export async function signOutStaff() {
  await clearStaffCookie();
  redirect("/staff/sign-in");
}

export async function approveApp(fd: FormData) {
  const { token } = await requireStaff();
  await api.approveApp(token, String(fd.get("clientId") ?? ""));
  revalidatePath("/staff/partner-apps");
}

export async function rejectApp(fd: FormData) {
  const { token } = await requireStaff();
  const reason = String(fd.get("reason") ?? "").trim();
  await api.rejectApp(token, String(fd.get("clientId") ?? ""), reason);
  revalidatePath("/staff/partner-apps");
}

// The staff session. There is no second password: this signs in with the same CMS account
// editors use, through email/api, which asks cms/api to check it and that it may open the
// "email" space. The opaque CMS token sits in an httpOnly cookie on this origin.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { staffMe, type StaffUser } from "@/lib/email";

export const STAFF_COOKIE = "itc_email_staff";

const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

export async function setStaffCookie(token: string, expiresAt: string) {
  (await cookies()).set(STAFF_COOKIE, token, { ...cookieBase(), expires: new Date(expiresAt) });
}

export async function clearStaffCookie() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function staffToken(): Promise<string | null> {
  return (await cookies()).get(STAFF_COOKIE)?.value ?? null;
}

/** The signed-in staff member, or null. Never throws. */
export async function currentStaff(): Promise<StaffUser | null> {
  const token = await staffToken();
  if (!token) return null;
  return (await staffMe(token))?.user ?? null;
}

/** The token and the staff member, or a redirect to sign-in. */
export async function requireStaff(next = "/staff/lists"): Promise<{ token: string; user: StaffUser }> {
  const token = await staffToken();
  const user = token ? await currentStaff() : null;
  if (!token || !user) redirect(`/staff/sign-in?next=${encodeURIComponent(next)}`);
  return { token, user };
}

export const atLeast = (user: StaffUser, role: "editor" | "publisher" | "admin") =>
  ({ editor: 0, publisher: 1, admin: 2 })[user.role] >= ({ editor: 0, publisher: 1, admin: 2 })[role];

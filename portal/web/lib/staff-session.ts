// The staff session for the portal's tools at /staff.
//
// There is no second password: these pages sign in with the same CMS account editors use, through
// portal/api, which asks cms/api to check it and that it may open the "portal" space. The opaque CMS
// token sits in an httpOnly cookie on this origin, separate from a contributor's session cookie.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { staff } from "@/lib/portal";

export const STAFF_COOKIE = "itc_portal_staff";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

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
  const r = await staff.overview(token);
  return r.ok ? (r.you as StaffUser) : null;
}

/** The token and the staff member, or a redirect to the staff sign-in. */
export async function requireStaff(next = "/staff"): Promise<{ token: string; user: StaffUser }> {
  const token = await staffToken();
  const user = token ? await currentStaff() : null;
  if (!token || !user) redirect(`/staff/sign-in?next=${encodeURIComponent(next)}`);
  return { token, user };
}

/** Role check for the pages that offer an action. */
export const atLeast = (user: StaffUser, role: "editor" | "publisher" | "admin") =>
  ({ editor: 0, publisher: 1, admin: 2 })[user.role] >= ({ editor: 0, publisher: 1, admin: 2 })[role];

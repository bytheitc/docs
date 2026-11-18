// The staff session. No second password: staff sign in with their CMS account, through docs/api,
// which asks cms/api whether it may open the "docs" space. The opaque CMS token sits in an httpOnly
// cookie on this origin and is forwarded to the api; the browser never sees it.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { staffMe, type StaffUser } from "@/lib/api";

export const STAFF_COOKIE = "itc_docs_staff";

const base = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

export async function setStaffCookie(token: string, expiresAt: string) {
  (await cookies()).set(STAFF_COOKIE, token, { ...base(), expires: new Date(expiresAt) });
}

export async function clearStaffCookie() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function staffToken(): Promise<string | null> {
  return (await cookies()).get(STAFF_COOKIE)?.value ?? null;
}

export async function currentStaff(): Promise<StaffUser | null> {
  const token = await staffToken();
  if (!token) return null;
  const r = await staffMe(token);
  return r.ok ? r.user : null;
}

export async function requireStaff(next = "/admin"): Promise<{ token: string; user: StaffUser }> {
  const token = await staffToken();
  const user = token ? await currentStaff() : null;
  if (!token || !user) redirect(`/admin/sign-in?next=${encodeURIComponent(next)}`);
  return { token, user };
}

export const canPublish = (u: StaffUser) => u.role === "publisher" || u.role === "admin";

/** Only same-site paths, so a sign-in link can't bounce someone to another site. */
export const safeNext = (v: string | undefined | null, fallback: string) => (v && /^\/(?!\/)[\w\-/?=&.%]*$/.test(v) ? v : fallback);

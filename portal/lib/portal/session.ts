// Contributor sessions. Separate from admin staff accounts: different cookie, different collection.
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalStore, requirePortalStore } from "@/lib/portal/store";
import type { Contributor } from "@/lib/portal/types";

export const SESSION_COOKIE = "itc_portal_session";
const SESSION_DAYS = 30;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

export async function startContributorSession(contributorId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await requirePortalStore().createSession({ tokenHash: sha256(token), contributorId, expiresAt, createdAt: now });
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase(), expires: expiresAt });
}

export async function endContributorSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const store = getPortalStore();
  if (token && store) await store.deleteSession(sha256(token));
  jar.delete(SESSION_COOKIE);
}

/** The signed-in contributor, or null. Never throws (no database, bad cookie, unreachable DB). */
export async function currentContributor(): Promise<Contributor | null> {
  const store = getPortalStore();
  if (!store) return null;
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await store.getSession(sha256(token));
    if (!session) return null;
    const c = await store.getContributor(session.contributorId);
    return c && !c.disabled ? c : null;
  } catch {
    return null;
  }
}

export async function requireContributor(next = "/dashboard"): Promise<Contributor> {
  const c = await currentContributor();
  if (!c) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return c;
}

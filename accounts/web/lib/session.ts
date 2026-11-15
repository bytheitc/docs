// The ITC account's session, from this web's point of view.
//
// accounts/api issues an opaque token; it lives in an httpOnly cookie on this origin and is
// forwarded to the api as `Authorization: Bearer …`. The browser never sees it, and the api never
// sets cookies (ARCHITECTURE.md, rule 3).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMe, type AccountProfile } from "@/lib/accounts";

export const SESSION_COOKIE = "itc_account_session";

const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

export async function setSessionCookie(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase(), expires: new Date(expiresAt) });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The session token this browser is carrying, or null. */
export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in ITC account, or null. Never throws (no cookie, expired session, api down). */
export async function currentAccount(): Promise<AccountProfile | null> {
  const token = await sessionToken();
  if (!token) return null;
  return (await getMe(token))?.account ?? null;
}

export async function requireAccount(next = "/account"): Promise<AccountProfile> {
  const a = await currentAccount();
  if (!a) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return a;
}

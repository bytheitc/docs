// The signed-in ITC account, from this site's point of view. Holds the access token in an
// httpOnly cookie on this origin and reads claims live from accounts/api's userinfo endpoint on
// every request that needs them — nothing is cached or duplicated here, the same "read it live"
// rule every other claim in "Sign in with ITC" already follows.
//
// No refresh token (this integration never asked for offline_access), so a session is exactly as
// long as the access token: about an hour, then signing in again is the only way back in. That's
// the right tradeoff for what this is so far — a sign-in button, not a thing anyone stays on for
// hours at a stretch.
import { cookies } from "next/headers";
import { getUserInfo, type AccountInfo } from "./accounts";

export const SESSION_COOKIE = "itc_oss_session";

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in account's claims, or null. Never throws (no cookie, expired token, accounts/api down). */
export async function currentAccount(): Promise<AccountInfo | null> {
  const token = await sessionToken();
  if (!token) return null;
  return getUserInfo(token);
}

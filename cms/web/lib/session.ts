// The editor's session: an httpOnly cookie on this origin holding the opaque CMS token,
// forwarded to cms/api as Authorization: Bearer from server components and actions.
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ApiError, api } from "@/lib/api";
import { can, type Role, type SpaceDetail, type User } from "@/lib/types";

const COOKIE = "itc_cms_token";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

export async function setToken(token: string, expiresAt?: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 14 * 864e5),
  });
}

export async function clearToken() {
  (await cookies()).delete(COOKIE);
}

/** Calls cms/api as the signed-in user. A missing or ended session sends them to the sign-in page. */
export async function authed<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/login");
  try {
    return await api<T>(path, { ...opts, token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }
}

/** The signed-in user, or null. Fetched once per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    return (await api<{ user: User }>("/v1/auth/me", { token })).user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});

/** For pages: redirects to sign-in when signed out, and home when the role is too low. */
export async function requireUser(needed: Role = "editor"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user, needed)) redirect(`/?denied=${needed}`);
  return user;
}

/** A space the user may open (fetched once per request), or a redirect/404. */
export const loadSpace = cache(async (id: string): Promise<SpaceDetail> => {
  try {
    return await authed<SpaceDetail>(`/v1/spaces/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) redirect(`/?noaccess=${encodeURIComponent(id)}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export const enc = encodeURIComponent;

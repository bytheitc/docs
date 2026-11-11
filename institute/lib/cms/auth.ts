// Admin authentication: password (scrypt) + server-side sessions. Identical in every app.
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireStorage } from "@/lib/cms/storage";
import type { Role, User } from "@/lib/cms/types";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const COOKIE = "itc_cms_session";
const SESSION_DAYS = 14;

export const MIN_PASSWORD = 12;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), expected.length, SCRYPT);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await requireStorage().createSession({ tokenHash: sha256(token), userId, expiresAt, createdAt: now });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await requireStorage().deleteSession(sha256(token));
  jar.delete(COOKIE);
}

/** The signed-in user, or null. Never throws for a missing/invalid session. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const store = requireStorage();
  const session = await store.getSession(sha256(token));
  if (!session) return null;
  const user = await store.getUserById(session.userId);
  return user && !user.disabled ? user : null;
}

const RANK: Record<Role, number> = { editor: 1, publisher: 2, admin: 3 };
export const can = (user: Pick<User, "role"> | null, needed: Role) => !!user && RANK[user.role] >= RANK[needed];

/** For admin pages and actions: redirects to login if signed out, and to the overview if the role is too low. */
export async function requireUser(needed: Role = "editor"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (!can(user, needed)) redirect(`/admin?denied=${needed}`);
  return user;
}

export const newId = () => randomUUID();

/**
 * Creating the very first admin. In development anyone on the machine may do it.
 * In production it requires CMS_SETUP_TOKEN, so a stranger can't claim a fresh deployment.
 */
export function setupTokenRequired(): boolean {
  return process.env.NODE_ENV === "production" || !!process.env.CMS_SETUP_TOKEN;
}
export function setupTokenValid(given: string): boolean {
  const expected = process.env.CMS_SETUP_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(sha256(given)), b = Buffer.from(sha256(expected));
  return timingSafeEqual(a, b);
}

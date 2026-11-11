// Authentication for the two kinds of caller:
//   space keys     house apis (service to service), one key per space, sent as Bearer
//   user sessions  cms/web and staff tools; opaque random tokens, only their sha256 is stored, 14-day TTL
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import type { Config } from "./config.js";
import { forbidden, notFound, unauthorized } from "./http.js";
import type { PublicUser, Role, SpaceAccess, SpaceRecord, StorageAdapter, User } from "./types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `userAuth`: the signed-in user. */
      user?: User;
      /** Set by `userAuth`: the hash of the session token used. */
      sessionHash?: string;
      /** Set by `spaceKeyAuth`: the space the presented key belongs to. */
      keySpace?: string;
    }
  }
}

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_DAYS = 14;
export const MIN_PASSWORD = 12;
export const MAX_PASSWORD = 512;

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

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newId = () => randomUUID();

/** Compares two secrets in constant time (hashing first so lengths always match). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(sha256(a)), Buffer.from(sha256(b)));
}

export function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = /^Bearer\s+(\S+)\s*$/i.exec(h);
  return m ? m[1] : null;
}

export function publicUser(u: User): PublicUser {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return { ...rest, spaces: rest.role === "admin" ? "*" : rest.spaces ?? [] };
}

/* ------------------------------------------------------------------ */
/* Sessions                                                           */
/* ------------------------------------------------------------------ */

export async function startSession(store: StorageAdapter, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await store.createSession({ tokenHash: sha256(token), userId, expiresAt, createdAt: now });
  return { token, expiresAt };
}

/** The active user behind a session token, or null. */
export async function userForToken(store: StorageAdapter, token: string): Promise<{ user: User; hash: string } | null> {
  if (!token || token.length > 200) return null;
  const hash = sha256(token);
  const session = await store.getSession(hash);
  if (!session) return null;
  const user = await store.getUserById(session.userId);
  return user && !user.disabled ? { user, hash } : null;
}

const RANK: Record<Role, number> = { editor: 1, publisher: 2, admin: 3 };
export const can = (user: Pick<User, "role"> | null | undefined, needed: Role) => !!user && RANK[user.role] >= RANK[needed];

/** Whether the user may open a space. Admins may open every space. */
export function canAccess(user: Pick<User, "role" | "spaces">, space: string): boolean {
  if (user.role === "admin") return true;
  const s: SpaceAccess = user.spaces ?? [];
  return s === "*" || s.includes(space);
}

/** Middleware: requires a valid user session (Bearer token). */
export function userAuth(store: StorageAdapter) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) throw unauthorized();
    const found = await userForToken(store, token);
    if (!found) throw unauthorized("Your session has ended. Sign in again.");
    req.user = found.user;
    req.sessionHash = found.hash;
    next();
  };
}

export function requireRole(req: Request, needed: Role): User {
  const user = req.user;
  if (!user) throw unauthorized();
  if (!can(user, needed)) throw forbidden(`That needs the ${needed} role.`);
  return user;
}

/** Loads a registered space the signed-in user may open, or throws 404/403. */
export async function requireSpace(store: StorageAdapter, req: Request, spaceId: string): Promise<SpaceRecord> {
  const user = req.user;
  if (!user) throw unauthorized();
  const space = await store.getSpace(spaceId);
  if (!space) throw notFound(`There is no space "${spaceId}".`);
  if (!canAccess(user, space.id)) throw forbidden(`Your account doesn't have access to the ${space.label} space.`);
  return space;
}

/* ------------------------------------------------------------------ */
/* Space keys                                                         */
/* ------------------------------------------------------------------ */

const DEV_KEY = /^dev-([a-z][a-z0-9-]{0,39})-key$/;

/** The space a key belongs to, or null. Configured keys first; dev keys only outside production. */
export function spaceForKey(config: Config, key: string): string | null {
  let match: string | null = null;
  // Check every configured key (no early exit) so timing doesn't reveal which space matched.
  for (const [space, k] of config.spaceKeys) if (safeEqual(key, k) && !match) match = space;
  if (match) return match;
  if (!config.production) {
    const m = DEV_KEY.exec(key);
    if (m && !config.spaceKeys.has(m[1])) return m[1];
  }
  return null;
}

/** The key a space's webhooks are signed with (its configured key, or its dev key outside production). */
export function signingKey(config: Config, space: string): string | null {
  return config.spaceKeys.get(space) ?? (config.production ? null : `dev-${space}-key`);
}

/** Middleware: requires a space key. When the route has `:space`, the key must belong to it. */
export function spaceKeyAuth(config: Config) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = bearer(req);
    if (!key) throw unauthorized("A space key is required (Authorization: Bearer <key>).");
    const space = spaceForKey(config, key);
    if (!space) throw unauthorized("That space key is not valid.");
    const wanted = req.params.space;
    if (wanted !== undefined && wanted !== space) throw forbidden(`This key belongs to space "${space}", not "${wanted}".`);
    req.keySpace = space;
    next();
  };
}

/* ------------------------------------------------------------------ */
/* First-admin setup                                                  */
/* ------------------------------------------------------------------ */

/** In production the first admin needs CMS_SETUP_TOKEN, so a stranger can't claim a fresh deployment. */
export function setupTokenRequired(config: Config): boolean {
  return config.production || !!config.setupToken;
}

export function setupTokenValid(config: Config, given: string): boolean {
  const expected = config.setupToken;
  if (!expected) return false;
  return safeEqual(given, expected);
}

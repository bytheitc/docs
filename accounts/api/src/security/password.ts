// First-party password credentials. scrypt, not a hand-rolled hash and not a pulled-in bcrypt/
// argon2 dependency: Node's built-in `crypto.scrypt` is exactly what the Node docs recommend for
// password storage when you aren't reaching for a dedicated library, and this codebase already
// leans on `node:crypto` everywhere else (see oauth/crypto.ts).
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LEN = 64;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

export interface PasswordHash {
  hash: string;
  salt: string;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN);
  return { hash: key.toString("hex"), salt: salt.toString("hex") };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const key = await scrypt(password, Buffer.from(stored.salt, "hex"), KEY_LEN);
  const given = Buffer.from(stored.hash, "hex");
  // Lengths should always match (both derived with KEY_LEN), but timingSafeEqual throws on a
  // mismatch rather than returning false, and a corrupt row is not this function's problem to
  // crash on.
  return given.length === key.length && timingSafeEqual(given, key);
}

let dummy: Promise<PasswordHash> | null = null;

/**
 * A hash of nothing a real password will ever match, for a login handler to run `verifyPassword`
 * against when there's no real credential to check (no such handle, no password set) — so the
 * scrypt cost is paid either way and a response-time difference doesn't tell an attacker which
 * case they hit. Memoized: a fresh one per request would work too, but there is nothing to gain
 * by hashing something new every time.
 */
export function dummyPasswordHash(): Promise<PasswordHash> {
  return (dummy ??= hashPassword(randomBytes(32).toString("hex")));
}

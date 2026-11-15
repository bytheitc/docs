// One-time backup codes, for when 2FA is on and the authenticator isn't to hand. Hashed and
// compared exactly the way every other token in this service is (see oauth/crypto.ts's `sha256`).
import { randomInt } from "node:crypto";

// Excludes visually ambiguous characters (0/O, 1/I/L) — these get read off a screen by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUPS = 2;
const GROUP_LEN = 5;

function oneCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let s = "";
    for (let i = 0; i < GROUP_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(s);
  }
  return groups.join("-");
}

/** A fresh batch, shown to the person exactly once. */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, oneCode);
}

/** Normalizes what someone typed back (case, stray whitespace) before hashing and comparing. */
export const normalizeRecoveryCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

// TOTP (RFC 6238, built on RFC 4226's HOTP). Hand-rolled: unlike WebAuthn's signature and
// attestation verification, this is a dozen lines of HMAC-SHA1 over a counter, the kind of thing
// this codebase already hand-rolls correctly elsewhere (see oauth/crypto.ts).
import { createHmac, randomBytes } from "node:crypto";
import { safeEqual } from "../oauth/crypto.js";

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** A fresh 20-byte (160-bit) shared secret, base32-encoded, as every authenticator app expects. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

/** The code for a given moment (now by default). */
export function totpCode(secretBase32: string, at: Date = new Date()): string {
  return hotp(base32Decode(secretBase32), Math.floor(at.getTime() / 1000 / STEP_SECONDS));
}

/**
 * The step that matched a code, checking the current 30-second step and one either side (so a
 * slow typist or a clock a few seconds off isn't locked out), or null if none did. Compares with
 * `safeEqual` rather than `===` — a HOTP code is as much a secret as anything else compared that
 * way in this codebase, and a timing difference on the comparison is a real, if narrow, side
 * channel. The step number is what a caller needs to reject reusing the same code twice; a caller
 * that only wants a yes/no should use `verifyTotp`.
 */
export function totpStepForCode(secretBase32: string, code: string, at: Date = new Date()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const step = Math.floor(at.getTime() / 1000 / STEP_SECONDS);
  for (const delta of [0, -1, 1]) {
    const candidate = step + delta;
    if (safeEqual(hotp(secret, candidate), code)) return candidate;
  }
  return null;
}

/** Checks a code against the current step and one either side. Does not stop the same code being
 * accepted twice in a row within that window — see `totpStepForCode` for the replay-safe check
 * every sign-in path in this service actually uses. */
export function verifyTotp(secretBase32: string, code: string, at: Date = new Date()): boolean {
  return totpStepForCode(secretBase32, code, at) !== null;
}

/** The otpauth:// URL an authenticator app's QR scanner expects. */
export function totpUrl(secretBase32: string, accountLabel: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

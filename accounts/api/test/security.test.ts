// First-party credentials: password hashing, TOTP, and recovery codes. Pure functions — no
// database, no server. WebAuthn's own signature/attestation verification is exercised by
// @simplewebauthn/server's own test suite, not re-tested here; what's tested here is this
// service's use of it (rpID/origin scoping) and the parts it hand-rolls itself.
import { strict as assert } from "node:assert";
import test from "node:test";

import { dummyPasswordHash, hashPassword, verifyPassword } from "../src/security/password.js";
import { generateRecoveryCodes, normalizeRecoveryCode } from "../src/security/recoveryCodes.js";
import { generateTotpSecret, totpCode, totpStepForCode, totpUrl, verifyTotp } from "../src/security/totp.js";
import { rpConfig } from "../src/security/webauthn.js";
import type { Config } from "../src/config.js";

/* ------------------------------------------------------------- password --- */

test("password: the right password verifies and a wrong one does not", async () => {
  const stored = await hashPassword("a reasonably good passphrase");
  assert.equal(await verifyPassword("a reasonably good passphrase", stored), true);
  assert.equal(await verifyPassword("a reasonably good passphrase!", stored), false);
});

test("password: the hash is never the password, and two hashes of the same password differ", async () => {
  const a = await hashPassword("correct horse battery staple");
  const b = await hashPassword("correct horse battery staple");
  assert.notEqual(a.hash, "correct horse battery staple");
  assert.notEqual(a.salt, b.salt, "a fresh random salt every time");
  assert.notEqual(a.hash, b.hash, "so the hashes differ too, even for the same password");
});

test("password: the dummy hash never verifies against anything, and is memoized", async () => {
  const dummy = await dummyPasswordHash();
  assert.equal(await verifyPassword("anything at all", dummy), false);
  assert.equal(await verifyPassword("", dummy), false);
  assert.strictEqual(await dummyPasswordHash(), dummy, "the same instance every call — nothing to gain from a fresh one");
});

/* ------------------------------------------------------------------ TOTP --- */

test("TOTP: the code for right now verifies, and a code from ten minutes ago does not", () => {
  const secret = generateTotpSecret();
  const now = new Date("2026-11-15T12:00:00Z");
  const code = totpCode(secret, now);
  assert.equal(verifyTotp(secret, code, now), true);
  assert.equal(verifyTotp(secret, code, new Date(now.getTime() + 600_000)), false);
});

test("TOTP: one step of clock drift either way still verifies", () => {
  const secret = generateTotpSecret();
  const now = new Date("2026-11-15T12:00:00Z");
  const code = totpCode(secret, now);
  assert.equal(verifyTotp(secret, code, new Date(now.getTime() + 29_000)), true);
  assert.equal(verifyTotp(secret, code, new Date(now.getTime() - 29_000)), true);
});

test("TOTP: a code that isn't six digits is refused before it's even checked", () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotp(secret, "12345"), false);
  assert.equal(verifyTotp(secret, "abcdef"), false);
});

test("TOTP: totpStepForCode names which step matched, for a caller that has to reject reusing it", () => {
  const secret = generateTotpSecret();
  const now = new Date("2026-11-15T12:00:00Z");
  const step = Math.floor(now.getTime() / 1000 / 30);
  assert.equal(totpStepForCode(secret, totpCode(secret, now), now), step);
  assert.equal(totpStepForCode(secret, "000000", now) === step, false, "a wrong code never claims to be the real step");
});

test("TOTP: an adjacent step's code names a different step number than the current one", () => {
  const secret = generateTotpSecret();
  const now = new Date("2026-11-15T12:00:00Z");
  const earlier = new Date(now.getTime() - 29_000);
  const stepNow = totpStepForCode(secret, totpCode(secret, now), now);
  const stepEarlier = totpStepForCode(secret, totpCode(secret, earlier), now);
  assert.notEqual(stepEarlier, null);
  assert.notEqual(stepEarlier, stepNow, "so a store can tell the two codes apart and refuse a replay of either alone");
});

test("TOTP: the otpauth URL carries the secret and this service's issuer", () => {
  const secret = generateTotpSecret();
  const url = totpUrl(secret, "amina", "ITC Account");
  assert.match(url, /^otpauth:\/\/totp\//);
  assert.ok(url.includes(encodeURIComponent(secret)) || url.includes(`secret=${secret}`));
  assert.ok(url.includes("ITC%20Account") || url.includes("ITC+Account"));
});

/* ------------------------------------------------------------ recovery --- */

test("recovery codes: a fresh batch is the right size and every code is unique", () => {
  const codes = generateRecoveryCodes(10);
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const c of codes) assert.match(c, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
});

test("recovery codes: normalizing tolerates case and stray whitespace", () => {
  const code = generateRecoveryCodes(1)[0];
  assert.equal(normalizeRecoveryCode(` ${code.toLowerCase()} `), code);
});

/* -------------------------------------------------------------- rpConfig --- */

test("webauthn rpConfig scopes to accounts/web's own origin, not this api's", () => {
  const config = { web: { url: "https://id.itc.org" } } as Config;
  const { rpID, origin } = rpConfig(config);
  assert.equal(rpID, "id.itc.org");
  assert.equal(origin, "https://id.itc.org");
});

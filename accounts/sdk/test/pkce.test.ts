import { strict as assert } from "node:assert";
import test from "node:test";

import { createPkcePair, randomToken } from "../src/pkce.js";

test("the challenge is the S256 of the verifier, computed the way the provider will check it", async () => {
  const { verifier, challenge } = await createPkcePair();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(challenge, expected);
});

test("the verifier is RFC 7636 shaped: 43-128 unreserved characters", async () => {
  const { verifier } = await createPkcePair();
  assert.match(verifier, /^[A-Za-z0-9\-._~]{43,128}$/);
});

test("every pair is different", async () => {
  const a = await createPkcePair();
  const b = await createPkcePair();
  assert.notEqual(a.verifier, b.verifier);
});

test("randomToken is unguessable and the right length", () => {
  const a = randomToken(24);
  const b = randomToken(24);
  assert.notEqual(a, b);
  assert.ok(a.length >= 30);
});

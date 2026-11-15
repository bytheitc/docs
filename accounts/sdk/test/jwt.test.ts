// decodeJwt and verifyJwt, against a key pair generated in the test itself — no live server, no
// dependency on accounts/api's own signing code, just the same Web Crypto primitives a real
// provider uses.
import { strict as assert } from "node:assert";
import test from "node:test";

import { base64UrlDecode, base64UrlEncode } from "../src/base64url.js";
import { decodeJwt, JwtVerificationError, verifyJwt, type Jwks } from "../src/jwt.js";

const ISSUER = "https://id.itc.example";
const AUDIENCE = "test-client";

async function keyPair() {
  return crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
}

async function signToken(privateKey: CryptoKey, claims: Record<string, unknown>, kid = "k1"): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT", kid })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function jwksFor(publicKey: CryptoKey, kid = "k1"): Promise<Jwks> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return { keys: [{ kty: "RSA", use: "sig", alg: "RS256", kid, n: jwk.n!, e: jwk.e! }] };
}

test("decodeJwt reads the claims without touching the signature", async () => {
  const { privateKey } = await keyPair();
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(privateKey, { iss: ISSUER, aud: AUDIENCE, sub: "u-1", iat: now, exp: now + 3600 });
  assert.equal(decodeJwt(token).payload.sub, "u-1");
});

test("verifyJwt accepts a correctly signed, correctly claimed token", async () => {
  const { privateKey, publicKey } = await keyPair();
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(privateKey, { iss: ISSUER, aud: AUDIENCE, sub: "u-1", iat: now, exp: now + 3600 });
  const claims = await verifyJwt(token, await jwksFor(publicKey), { issuer: ISSUER, audience: AUDIENCE });
  assert.equal(claims.sub, "u-1");
});

test("verifyJwt rejects a token signed by a different key", async () => {
  const { privateKey } = await keyPair();
  const { publicKey: someoneElsesPublicKey } = await keyPair();
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(privateKey, { iss: ISSUER, aud: AUDIENCE, sub: "u-1", iat: now, exp: now + 3600 });
  const wrongJwks = await jwksFor(someoneElsesPublicKey);
  await assert.rejects(() => verifyJwt(token, wrongJwks, { issuer: ISSUER, audience: AUDIENCE }), JwtVerificationError);
});

test("verifyJwt rejects the wrong issuer and the wrong audience", async () => {
  const { privateKey, publicKey } = await keyPair();
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(privateKey, { iss: ISSUER, aud: AUDIENCE, sub: "u-1", iat: now, exp: now + 3600 });
  const jwks = await jwksFor(publicKey);
  await assert.rejects(() => verifyJwt(token, jwks, { issuer: "https://someone-else.example", audience: AUDIENCE }), JwtVerificationError);
  await assert.rejects(() => verifyJwt(token, jwks, { issuer: ISSUER, audience: "someone-elses-client" }), JwtVerificationError);
});

test("verifyJwt rejects an expired token", async () => {
  const { privateKey, publicKey } = await keyPair();
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(privateKey, { iss: ISSUER, aud: AUDIENCE, sub: "u-1", iat: now - 7200, exp: now - 3600 });
  const jwks = await jwksFor(publicKey);
  await assert.rejects(() => verifyJwt(token, jwks, { issuer: ISSUER, audience: AUDIENCE }), JwtVerificationError);
});

test("verifyJwt rejects anything not alg RS256", async () => {
  const { publicKey } = await keyPair();
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "none", typ: "JWT" })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ iss: ISSUER, aud: AUDIENCE })));
  const token = `${header}.${payload}.`;
  const jwks = await jwksFor(publicKey);
  await assert.rejects(() => verifyJwt(token, jwks, { issuer: ISSUER, audience: AUDIENCE }), JwtVerificationError);
});

test("base64url round-trips arbitrary bytes", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(37));
  assert.deepEqual(base64UrlDecode(base64UrlEncode(bytes)), bytes);
});

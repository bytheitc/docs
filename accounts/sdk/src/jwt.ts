// Decoding and verifying the id_token. Decoding alone is one line and is never enough on its own
// — anyone can write a JWT with whatever claims they like. Verifying checks the RS256 signature
// against the provider's published JWKS using the platform's own Web Crypto, the same primitive
// every serious JWT library is built on; nothing here parses or re-implements the cryptography.
import { base64UrlDecode } from "./base64url.js";

export interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export interface Jwk {
  kty: string;
  use?: string;
  alg?: string;
  kid?: string;
  n: string;
  e: string;
}

export interface Jwks {
  keys: Jwk[];
}

/** Splits and base64url-decodes a compact JWT's header and payload. Does not check the signature. */
export function decodeJwt(token: string): JwtParts {
  const [h, p] = token.split(".");
  if (!h || !p) throw new Error("That doesn't look like a JWT (expected header.payload.signature).");
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(h))) as Record<string, unknown>;
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p))) as Record<string, unknown>;
  return { header, payload };
}

export class JwtVerificationError extends Error {}

/**
 * Verifies an RS256 id_token against a JWKS already in hand (see client.ts's `getJwks` for
 * fetching one) and checks `iss`, `aud` and `exp`. Throws `JwtVerificationError` on any failure
 * — a caller that only wants the claims without verifying should use `decodeJwt` and say so.
 */
export async function verifyJwt(token: string, jwks: Jwks, expected: { issuer: string; audience: string }): Promise<Record<string, unknown>> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new JwtVerificationError("That doesn't look like a JWT (expected header.payload.signature).");

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(h))) as { alg?: string; kid?: string };
  if (header.alg !== "RS256") throw new JwtVerificationError(`Unsupported alg "${header.alg}"; "Sign in with ITC" only signs with RS256.`);

  const jwk = jwks.keys.find((k) => !header.kid || k.kid === header.kid);
  if (!jwk) throw new JwtVerificationError("No matching key in the JWKS for this token's kid.");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key,
    base64UrlDecode(s) as BufferSource,
    new TextEncoder().encode(`${h}.${p}`) as BufferSource,
  );
  if (!ok) throw new JwtVerificationError("Signature did not verify.");

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p))) as Record<string, unknown>;
  if (payload.iss !== expected.issuer) throw new JwtVerificationError(`iss "${payload.iss}" does not match the expected issuer.`);
  if (payload.aud !== expected.audience) throw new JwtVerificationError(`aud "${payload.aud}" does not match this client_id.`);
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) throw new JwtVerificationError("This id_token has expired.");

  return payload;
}

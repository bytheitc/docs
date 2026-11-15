// PKCE (RFC 7636), S256 only — "Sign in with ITC" refuses `plain`, so there is no reason to offer
// it here either.
import { base64UrlEncode } from "./base64url.js";

export interface PkcePair {
  /** Keep this on the client until the token exchange; never send it in the authorize redirect. */
  verifier: string;
  /** Goes in the authorize URL's `code_challenge`. */
  challenge: string;
}

/** A fresh verifier/challenge pair for one sign-in attempt. */
export async function createPkcePair(): Promise<PkcePair> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = base64UrlEncode(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

/** A random `state` (or `nonce`) value — opaque, just needs to be unguessable and echoed back. */
export function randomToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

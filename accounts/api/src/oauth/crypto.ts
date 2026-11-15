// The cryptographic parts of the provider, kept together so they can be read in one sitting.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as nodeSign,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** A fresh opaque token. 32 bytes of randomness, url-safe. Only ever stored as a hash. */
export const newToken = () => randomBytes(32).toString("base64url");

/**
 * Constant-time string comparison.
 *
 * `===` on a secret leaks its prefix through timing. Lengths are compared first because
 * timingSafeEqual throws on a mismatch, and the length of a secret is not the secret.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * PKCE, S256 only.
 *
 * `plain` is in the RFC but it protects nothing — anyone who can steal the code can read the
 * verifier off the same request — so it is not accepted here.
 */
export function verifyPkce(verifier: string, challenge: string): boolean {
  // RFC 7636: the verifier is 43–128 unreserved characters.
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEqual(computed, challenge);
}

/* --------------------------------------------------------------- signing --- */

const b64url = (b: Buffer | string) =>
  (Buffer.isBuffer(b) ? b : Buffer.from(b)).toString("base64url");

export interface SigningKey {
  privateKey: KeyObject;
  publicKey: KeyObject;
  /** RFC 7638 JWK thumbprint, so the kid changes if and only if the key does. */
  kid: string;
  /** True when the key was generated at boot rather than configured. */
  ephemeral: boolean;
}

let cached: SigningKey | null = null;

/**
 * The id_token signing key.
 *
 * In production this must come from OAUTH_SIGNING_KEY (a PKCS#8 PEM). In development an ephemeral
 * key is generated so the provider runs with no setup — but every restart invalidates previously
 * issued id_tokens, which is why it is refused in production rather than silently accepted.
 */
export function signingKey(env: NodeJS.ProcessEnv = process.env): SigningKey {
  if (cached) return cached;
  const pem = env.OAUTH_SIGNING_KEY;
  let privateKey: KeyObject;
  let ephemeral = false;

  if (pem) {
    privateKey = createPrivateKey({ key: pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem });
  } else {
    if (env.NODE_ENV === "production") {
      throw new Error("OAUTH_SIGNING_KEY is required in production: id_tokens must survive a restart.");
    }
    privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    ephemeral = true;
  }

  const publicKey = createPublicKey(privateKey);
  cached = { privateKey, publicKey, kid: thumbprint(publicKey), ephemeral };
  return cached;
}

/** Only for tests, which need a fresh key per case. */
export function resetSigningKey() {
  cached = null;
}

/** RFC 7638: SHA-256 over the canonical JWK, members in lexicographic order, no whitespace. */
function thumbprint(publicKey: KeyObject): string {
  const { n, e } = publicKey.export({ format: "jwk" }) as { n: string; e: string };
  return createHash("sha256").update(JSON.stringify({ e, kty: "RSA", n })).digest("base64url");
}

export function jwks(key: SigningKey) {
  const { n, e } = key.publicKey.export({ format: "jwk" }) as { n: string; e: string };
  return { keys: [{ kty: "RSA", use: "sig", alg: "RS256", kid: key.kid, n, e }] };
}

/** Signs a compact RS256 JWT. */
export function signJwt(claims: Record<string, unknown>, key: SigningKey): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: key.kid }));
  const payload = b64url(JSON.stringify(claims));
  const signature = nodeSign("sha256", Buffer.from(`${header}.${payload}`), key.privateKey);
  return `${header}.${payload}.${b64url(signature)}`;
}

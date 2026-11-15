// "Sign in with ITC," from this site's point of view. Hand-rolled rather than importing
// itc-accounts-sdk: this repo has no shared workspace and no shared package (ARCHITECTURE.md), so
// every house implements the pattern itself, the same way each house's own cms.ts and api.ts are
// independently written rather than shared. PKCE and the token exchange are only a few lines each
// — see accounts/sdk's README for the fuller walkthrough this mirrors.
const ACCOUNTS_URL = (process.env.ACCOUNTS_API_URL ?? "http://localhost:4009").replace(/\/+$/, "");
export const ACCOUNTS_CLIENT_ID = process.env.ACCOUNTS_CLIENT_ID ?? "";

interface Discovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

let discoveryPromise: Promise<Discovery> | null = null;
function discovery(): Promise<Discovery> {
  return (discoveryPromise ??= fetch(`${ACCOUNTS_URL}/oauth/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) })
    .then((res) => {
      if (!res.ok) throw new Error(`accounts discovery answered HTTP ${res.status}`);
      return res.json() as Promise<Discovery>;
    })
    .catch((e) => {
      discoveryPromise = null; // don't cache a failure — the next request should try again
      throw e;
    }));
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PkcePair { verifier: string; challenge: string }

export async function createPkcePair(): Promise<PkcePair> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(24)));
}

export async function buildAuthorizeUrl(opts: { redirectUri: string; state: string; codeChallenge: string }): Promise<string> {
  const d = await discovery();
  const url = new URL(d.authorization_endpoint);
  url.searchParams.set("client_id", ACCOUNTS_CLIENT_ID);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export interface TokenResponse { access_token: string; id_token?: string; expires_in: number }

/** Never throws on a bad exchange — a stale or replayed code is the visitor's problem, not a crash. */
export async function exchangeCode(opts: { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenResponse | null> {
  try {
    const d = await discovery();
    const res = await fetch(d.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", client_id: ACCOUNTS_CLIENT_ID, code: opts.code, redirect_uri: opts.redirectUri, code_verifier: opts.codeVerifier }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch (e) {
    console.error(`[web] accounts token exchange failed: ${(e as Error).message}`);
    return null;
  }
}

export interface AccountInfo { sub: string; preferred_username?: string; name?: string; picture?: string }

/** The signed-in account's claims for a live access token, or null (expired, revoked, or accounts/api unreachable). */
export async function getUserInfo(accessToken: string): Promise<AccountInfo | null> {
  try {
    const d = await discovery();
    const res = await fetch(d.userinfo_endpoint, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return (await res.json()) as AccountInfo;
  } catch {
    return null;
  }
}

// OAuth 2 authorization-code flow helpers (with PKCE S256 where the provider supports it).
import { createHash, randomBytes } from "node:crypto";
import { ProviderError, type FetchLike, type OAuthConfig, type TokenResponse } from "./types.js";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function authorizeUrl(cfg: OAuthConfig, redirectUri: string, state: string, verifier: string | null): string {
  const u = new URL(cfg.authorizeUrl);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  if (cfg.scopes.length) u.searchParams.set("scope", cfg.scopes.join(" "));
  if (cfg.pkce && verifier) {
    u.searchParams.set("code_challenge", pkceChallenge(verifier));
    u.searchParams.set("code_challenge_method", "S256");
  }
  for (const [k, v] of Object.entries(cfg.extraAuthorizeParams ?? {})) u.searchParams.set(k, v);
  return u.toString();
}

/** Exchanges the code for a token response. The caller uses it once for the profile and then drops it. */
export async function exchangeCode(fetch: FetchLike, cfg: OAuthConfig, code: string, redirectUri: string, verifier: string | null): Promise<TokenResponse> {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "itc-portal" };
  if (cfg.tokenAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`).toString("base64")}`;
  } else {
    body.set("client_id", cfg.clientId);
    body.set("client_secret", cfg.clientSecret);
  }
  if (cfg.pkce && verifier) body.set("code_verifier", verifier);
  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body: body.toString(), cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || json.error || !json.access_token) throw new ProviderError(`Token exchange failed (${res.status}${json.error ? `: ${String(json.error)}` : ""}).`);
  return json;
}

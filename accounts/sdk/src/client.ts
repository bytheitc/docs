// The HTTP half: discovery, the authorize URL, the token endpoint, userinfo and introspection.
// Every function takes the issuer explicitly rather than assuming one, so a sandbox and a
// production deployment of "Sign in with ITC" are just two different strings, never a build flag.
import type { Jwks } from "./jwt.js";

export interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  introspection_endpoint: string;
  revocation_endpoint: string;
  jwks_uri: string;
  scopes_supported: string[];
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
}

export class OAuthHttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "OAuthHttpError";
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const code = typeof parsed.error === "string" ? parsed.error : parsed.error?.code ?? "error";
    const message = parsed.error_description ?? parsed.error?.message ?? `HTTP ${res.status}`;
    throw new OAuthHttpError(res.status, code, message);
  }
  return parsed as T;
}

/** `GET {issuer}/.well-known/openid-configuration`, so nothing else here hard-codes a path. */
export async function discover(issuer: string): Promise<DiscoveryDocument> {
  const res = await fetch(`${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`);
  return readJson<DiscoveryDocument>(res);
}

export async function getJwks(discovery: DiscoveryDocument): Promise<Jwks> {
  const res = await fetch(discovery.jwks_uri);
  return readJson<Jwks>(res);
}

export interface AuthorizeUrlOptions {
  clientId: string;
  redirectUri: string;
  /** Space-separated. `openid` is implied if you leave it out. */
  scope?: string;
  state?: string;
  nonce?: string;
  codeChallenge: string;
}

/** The URL to send someone's browser to. */
export function buildAuthorizeUrl(discovery: DiscoveryDocument, opts: AuthorizeUrlOptions): string {
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", opts.scope?.includes("openid") ? opts.scope : `openid ${opts.scope ?? ""}`.trim());
  if (opts.state) url.searchParams.set("state", opts.state);
  if (opts.nonce) url.searchParams.set("nonce", opts.nonce);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface ClientAuth {
  clientId: string;
  /** Omit for a public client — PKCE is what protects it. */
  clientSecret?: string;
}

function clientAuthBody(auth: ClientAuth) {
  return { client_id: auth.clientId, ...(auth.clientSecret ? { client_secret: auth.clientSecret } : {}) };
}

/** The authorization_code grant: trades the code the redirect carried for tokens. */
export async function exchangeCode(
  discovery: DiscoveryDocument,
  auth: ClientAuth,
  opts: { code: string; redirectUri: string; codeVerifier: string },
): Promise<TokenResponse> {
  const res = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code: opts.code, redirect_uri: opts.redirectUri, code_verifier: opts.codeVerifier, ...clientAuthBody(auth) }),
  });
  return readJson<TokenResponse>(res);
}

/** The refresh_token grant. Only works if `offline_access` was in the original scope. */
export async function refreshAccessToken(
  discovery: DiscoveryDocument,
  auth: ClientAuth,
  opts: { refreshToken: string; scope?: string },
): Promise<TokenResponse> {
  const res = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ grant_type: "refresh_token", refresh_token: opts.refreshToken, ...(opts.scope ? { scope: opts.scope } : {}), ...clientAuthBody(auth) }),
  });
  return readJson<TokenResponse>(res);
}

/** Claims for a bearer access token, scoped to whatever was granted. */
export async function getUserInfo(discovery: DiscoveryDocument, accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(discovery.userinfo_endpoint, { headers: { authorization: `Bearer ${accessToken}` } });
  return readJson<Record<string, unknown>>(res);
}

export interface IntrospectionResult {
  active: boolean;
  sub?: string;
  client_id?: string;
  scope?: string;
  exp?: number;
  iat?: number;
}

/** For a resource server of your own: is this access token still live? Requires client auth. */
export async function introspectToken(discovery: DiscoveryDocument, auth: ClientAuth, token: string): Promise<IntrospectionResult> {
  const res = await fetch(discovery.introspection_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, ...clientAuthBody(auth) }),
  });
  return readJson<IntrospectionResult>(res);
}

/** Hands a token back before it would otherwise expire. */
export async function revokeToken(discovery: DiscoveryDocument, auth: ClientAuth, token: string): Promise<void> {
  const res = await fetch(discovery.revocation_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, ...clientAuthBody(auth) }),
  });
  await readJson<{ ok: true }>(res);
}

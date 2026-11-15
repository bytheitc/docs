// "Sign in with ITC" — a dependency-free client. See README.md for a walkthrough; this file is
// the one import most integrations need (`import { AccountsClient } from "itc-accounts-sdk"`).
// The standalone functions underneath (./client.ts, ./pkce.ts, ./jwt.ts) are exported too, for an
// integration that wants to call the token endpoint itself rather than through this wrapper.
import {
  buildAuthorizeUrl, discover, exchangeCode, getJwks, getUserInfo, introspectToken,
  refreshAccessToken, revokeToken, type AuthorizeUrlOptions, type DiscoveryDocument, type TokenResponse,
} from "./client.js";
import { createPkcePair, randomToken, type PkcePair } from "./pkce.js";
import { decodeJwt, verifyJwt } from "./jwt.js";

export * from "./client.js";
export * from "./pkce.js";
export * from "./jwt.js";

export interface AccountsClientOptions {
  /** The provider's address, e.g. "https://id.itc.org". */
  issuer: string;
  clientId: string;
  /** Omit for a public client. */
  clientSecret?: string;
}

/**
 * The whole flow, held together: fetches and caches discovery + the JWKS on first use, then
 * every method below is one call. Built from the standalone functions this module also exports —
 * reach for those directly if this shape doesn't fit (a different HTTP client, a cached discovery
 * document you already fetched, …).
 */
export class AccountsClient {
  private discoveryPromise?: Promise<DiscoveryDocument>;
  private jwksPromise?: Promise<Awaited<ReturnType<typeof getJwks>>>;

  constructor(private readonly opts: AccountsClientOptions) {}

  private discovery(): Promise<DiscoveryDocument> {
    return (this.discoveryPromise ??= discover(this.opts.issuer));
  }

  private async jwks() {
    return (this.jwksPromise ??= this.discovery().then(getJwks));
  }

  /** A fresh PKCE pair for one sign-in attempt. Keep `verifier` until you call `exchangeCode`. */
  createPkcePair(): Promise<PkcePair> {
    return createPkcePair();
  }

  /** A random `state` (or `nonce`). */
  randomToken(byteLength?: number): string {
    return randomToken(byteLength);
  }

  /** The URL to send someone's browser to. */
  async buildAuthorizeUrl(opts: Omit<AuthorizeUrlOptions, "clientId">): Promise<string> {
    return buildAuthorizeUrl(await this.discovery(), { ...opts, clientId: this.opts.clientId });
  }

  /** Trades the code the redirect carried for tokens. */
  async exchangeCode(opts: { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenResponse> {
    return exchangeCode(await this.discovery(), this.opts, opts);
  }

  /** Only works if `offline_access` was in the original scope. */
  async refresh(opts: { refreshToken: string; scope?: string }): Promise<TokenResponse> {
    return refreshAccessToken(await this.discovery(), this.opts, opts);
  }

  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    return getUserInfo(await this.discovery(), accessToken);
  }

  /** For a resource server of your own: is this access token still live? */
  async introspect(token: string) {
    return introspectToken(await this.discovery(), this.opts, token);
  }

  /** Hands a token back before it would otherwise expire. */
  async revoke(token: string): Promise<void> {
    return revokeToken(await this.discovery(), this.opts, token);
  }

  /** Reads an id_token's claims without checking the signature. Only ever use this for an
   * id_token your own server just received directly from the token endpoint over TLS — anywhere
   * else (a value a browser handed you, a token you stored and are reading back later), use
   * `verifyIdToken` instead. */
  decodeIdToken(idToken: string): Record<string, unknown> {
    return decodeJwt(idToken).payload;
  }

  /** Checks the id_token's RS256 signature against the provider's published JWKS, and its `iss`,
   * `aud` and `exp`. This is what most integrations should call. */
  async verifyIdToken(idToken: string): Promise<Record<string, unknown>> {
    return verifyJwt(idToken, await this.jwks(), { issuer: this.opts.issuer, audience: this.opts.clientId });
  }
}

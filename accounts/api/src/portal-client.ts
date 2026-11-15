// This service's client for portal/api — the only api it ever calls, and the only place an ITC
// account can be created (ARCHITECTURE.md rule 2: portal is still the only api that touches the
// contributor database; this api never does).
//
// Two different calls, for two different reasons:
//   * The login handshake proxies portal/api's existing `/auth/authorize` and `/auth/callback` —
//     the same federated sign-in portal/web and mobile already use, with accounts/web's own
//     redirect URI instead of theirs. Nothing on portal's side changes for this. Once the
//     resulting portal session token has been used once to read `/me`, it is discarded — the same
//     "exchange and discard" idiom portal/api already uses for upstream GitHub/GitLab tokens, one
//     level up.
//   * Ongoing identity claims (every time an access token is used, not just at login) call the one
//     new endpoint portal/api exposes for this: `GET /internal/contributors/:id`, authenticated by
//     a shared key instead of a person's bearer token.
import type { Config } from "./config.js";

const TIMEOUT_MS = 6000;

export interface PortalProvidersResult {
  providers: { id: string; name: string; category: string; blurb: string; configured: boolean }[];
  usable: { id: string; name: string; category: string }[];
  devEnabled: boolean;
  /** False only when portal/api itself could not be reached — never just because nothing is configured. */
  reachable: boolean;
}

export interface PortalAuthorizeResult {
  url: string;
  state: string;
  verifier: string;
  next: string;
  provider: string;
}

export type PortalCallbackResult =
  | { ok: true; to: string; token?: string; expiresAt?: string }
  | { ok: false; status: number; error: string };

export interface PortalContributor {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  tier?: string;
  entitlements?: string[];
  disabled?: boolean;
  /** Only populated by GET /internal/contributors/:id, for the `contributions` scope. */
  contributions?: number;
  houses?: string[];
}

export class PortalClient {
  constructor(private readonly config: Config) {}

  private async call(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.config.portal.apiUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
    });
  }

  /** Never throws: portal/api being unreachable is routine enough to degrade, not 500 on. */
  async providers(): Promise<PortalProvidersResult> {
    try {
      const res = await this.call("/auth/providers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Omit<PortalProvidersResult, "reachable">;
      return { ...body, reachable: true };
    } catch (e) {
      console.error(`[api] portal/api GET /auth/providers failed: ${(e as Error).message}`);
      return { providers: [], usable: [], devEnabled: false, reachable: false };
    }
  }

  /** Starts the federated handshake. `redirectUri` is accounts/web's own callback, not portal's. */
  async authorize(args: { provider: string; redirectUri: string; next?: string; user?: string }): Promise<PortalAuthorizeResult | { error: string; status: number }> {
    try {
      const res = await this.call("/auth/authorize", { method: "POST", body: JSON.stringify(args) });
      const parsed = (await res.json().catch(() => ({}))) as Partial<PortalAuthorizeResult> & { error?: { message?: string } | string };
      if (!res.ok) return { error: typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? "That platform isn't available.", status: res.status };
      return parsed as PortalAuthorizeResult;
    } catch (e) {
      console.error(`[api] portal/api POST /auth/authorize failed: ${(e as Error).message}`);
      return { error: "The portal service could not be reached.", status: 503 };
    }
  }

  /** Completes the handshake. Never called with a bearer token: accounts/web has no portal session to link. */
  async callback(args: { provider: string; code: string; redirectUri: string; verifier?: string; next?: string }): Promise<PortalCallbackResult> {
    try {
      const res = await this.call("/auth/callback", { method: "POST", body: JSON.stringify(args) });
      const parsed = (await res.json().catch(() => ({}))) as { ok?: boolean; to?: string; token?: string; expiresAt?: string; error?: string };
      if (!res.ok || !parsed.ok) return { ok: false, status: res.status, error: parsed.error ?? "exchange" };
      return { ok: true, to: parsed.to ?? "/", token: parsed.token, expiresAt: parsed.expiresAt };
    } catch (e) {
      console.error(`[api] portal/api POST /auth/callback failed: ${(e as Error).message}`);
      return { ok: false, status: 503, error: "unavailable" };
    }
  }

  /** Reads the contributor a portal session token belongs to, then that token is thrown away.
   * Never throws: portal/api being briefly unreachable here must fail the one login attempt in
   * progress, not crash the request with a 500. */
  async me(portalSessionToken: string): Promise<PortalContributor | null> {
    try {
      const res = await this.call("/me", { headers: { authorization: `Bearer ${portalSessionToken}` } });
      if (!res.ok) return null;
      const body = (await res.json()) as { contributor?: PortalContributor };
      return body.contributor ?? null;
    } catch (e) {
      console.error(`[api] portal/api GET /me failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Live profile claims for an id_token or userinfo response, by portal contributor id. Never
   * throws: this is on the hot path of every token issuance and userinfo call, and a contributor
   * accounts/api can't currently reach is indistinguishable here from one that's gone — both fail
   * closed, the same as a 404, rather than 500ing the caller. */
  async contributor(portalContributorId: string): Promise<PortalContributor | null> {
    try {
      const res = await this.call(`/internal/contributors/${encodeURIComponent(portalContributorId)}`, {
        headers: { authorization: `Bearer ${this.config.portal.serviceKey}` },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { contributor?: PortalContributor };
      return body.contributor ?? null;
    } catch (e) {
      console.error(`[api] portal/api GET /internal/contributors/${portalContributorId} failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** The same, looked up by handle — all a password sign-in form is handed. */
  async contributorByHandle(handle: string): Promise<PortalContributor | null> {
    try {
      const res = await this.call(`/internal/contributors/by-handle/${encodeURIComponent(handle)}`, {
        headers: { authorization: `Bearer ${this.config.portal.serviceKey}` },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { contributor?: PortalContributor };
      return body.contributor ?? null;
    } catch (e) {
      console.error(`[api] portal/api GET /internal/contributors/by-handle/${handle} failed: ${(e as Error).message}`);
      return null;
    }
  }
}

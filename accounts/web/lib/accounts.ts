// This web's client for accounts/api. Every call runs on the server and carries the ITC account's
// session token as a bearer; nothing here reaches a browser.
const API_URL = (process.env.API_URL ?? "http://localhost:4009").replace(/\/+$/, "");
const TIMEOUT_MS = 8000;

export type Fail = { ok: false; status: number; message: string; errors?: Record<string, string> };
export type Result<T> = ({ ok: true } & T) | Fail;

interface CallOpts {
  method?: string;
  token?: string | null;
  body?: unknown;
  revalidate?: number;
}

async function call<T>(path: string, opts: CallOpts = {}): Promise<Result<T>> {
  const { method = "GET", token, body, revalidate } = opts;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(revalidate != null ? { next: { revalidate } } : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!res.ok) {
      // Two error shapes travel over this wire: the house default `{ error: { code, message,
      // fields } }`, and RFC 6749's own `{ error: "<code>", error_description: "<message>" }` from
      // the oauth endpoints specifically (see accounts/api routes/oauth.ts's error handler).
      const nested = typeof parsed.error === "object" && parsed.error ? (parsed.error as { message?: string; fields?: Record<string, string> }) : undefined;
      const message = nested?.message
        ?? (typeof parsed.error_description === "string" ? parsed.error_description : undefined)
        ?? (typeof parsed.error === "string" ? parsed.error : undefined)
        ?? `accounts answered HTTP ${res.status}.`;
      return { ok: false, status: res.status, message, errors: nested?.fields };
    }
    return { ok: true, ...(parsed as T) };
  } catch (e) {
    console.error(`[web] ${method} ${path} failed: ${(e as Error).message}`);
    return { ok: false, status: 503, message: "The accounts service could not be reached." };
  }
}

const orNull = async <T>(p: Promise<Result<T>>): Promise<T | null> => {
  const r = await p;
  return r.ok ? (r as T) : null;
};

/* ---------------- the signed-in ITC account ---------------- */

export interface AccountProfile {
  id: string;
  disabled: boolean;
  handle?: string;
  displayName?: string;
  avatarUrl?: string;
  tier?: string;
  entitlements?: string[];
}

export const getMe = (token: string) => orNull<{ account: AccountProfile }>(call<{ account: AccountProfile }>("/account/me", { token }));

/* ---------------- sign-in (delegates to portal/api) ---------------- */

export interface ProvidersView {
  providers: { id: string; name: string; category: string; blurb: string; configured: boolean }[];
  usable: { id: string; name: string; category: string }[];
  devEnabled: boolean;
  /** False only on a real fetch/HTTP failure — never just because nothing is configured yet. */
  reachable: boolean;
}

export async function getProviders(): Promise<ProvidersView> {
  const r = await call<ProvidersView>("/login/providers", { revalidate: 60 });
  return r.ok ? { providers: r.providers, usable: r.usable, devEnabled: r.devEnabled, reachable: r.reachable } : { providers: [], usable: [], devEnabled: false, reachable: false };
}

export const loginAuthorize = (payload: { provider: string; next: string; redirectUri: string; user?: string }) =>
  call<{ url: string; state: string; verifier: string; next: string; provider: string }>("/login/authorize", { method: "POST", body: payload });

export const completeLogin = (payload: { provider: string; code: string; redirectUri: string; verifier: string; next: string }) =>
  call<{ to: string; token?: string; expiresAt?: string; error?: string }>("/login/callback", { method: "POST", body: payload });

export const signOut = (token: string | null) => call<Record<string, never>>("/login/signout", { method: "POST", token });
export const signOutEverywhere = (token: string | null) => call<Record<string, never>>("/login/signout-all", { method: "POST", token });

/* ---------------- "Sign in with ITC": authorize + consent ---------------- */

export interface AuthorizeView {
  client: { clientId: string; name: string; homepage?: string; trusted: boolean };
  scopes: { id: string; description: string }[];
  unknownScopes: string[];
  signedIn: boolean;
  needsConsent: boolean;
}

export const describeAuthorize = (query: string, token: string | null) =>
  call<AuthorizeView>(`/oauth/authorize?${query}`, { token });

export const approveAuthorize = (
  payload: { client_id: string; redirect_uri: string; response_type: string; scope: string; state?: string; nonce?: string; code_challenge: string; code_challenge_method: string },
  token: string,
) => call<{ ok: true; redirectTo: string }>("/oauth/authorize", { method: "POST", token, body: payload });

/* ---------------- connected apps ---------------- */

export interface Grant {
  clientId: string;
  name: string;
  homepage?: string;
  scopes: { id: string; description: string }[];
  createdAt: string;
  lastUsedAt?: string;
}

export const listGrants = (token: string) => orNull<{ grants: Grant[] }>(call<{ grants: Grant[] }>("/oauth/grants", { token }));
export const revokeGrant = (clientId: string, token: string) => call<Record<string, never>>(`/oauth/grants/${encodeURIComponent(clientId)}`, { method: "DELETE", token });

/* ---------------- account security: what's enrolled ---------------- */

export interface Credentials {
  passkeys: { credentialId: string; name: string; createdAt: string; lastUsedAt?: string }[];
  password: boolean;
  totp: boolean;
  recoveryCodesRemaining: number;
}

export const getCredentials = (token: string) => orNull<Credentials>(call<Credentials>("/account/credentials", { token }));

/* ---------------- passkeys ---------------- */
// These two are also called directly by the Route Handlers under app/api/webauthn/*, which run
// server-side and forward the session cookie as a bearer — the browser's own WebAuthn JS never
// sees it (ARCHITECTURE.md rule 3).

export const webauthnRegisterOptions = (token: string) =>
  call<{ options: Record<string, unknown> }>("/account/webauthn/register/options", { method: "POST", token });

export const webauthnRegisterVerify = (token: string, response: unknown, name: string) =>
  call<{ credential: { credentialId: string; name: string; createdAt: string } }>("/account/webauthn/register/verify", { method: "POST", token, body: { response, name } });

export const deletePasskey = (token: string, credentialId: string) =>
  call<Record<string, never>>(`/account/webauthn/${encodeURIComponent(credentialId)}`, { method: "DELETE", token });

export const webauthnLoginOptions = () =>
  call<{ options: Record<string, unknown>; flowId: string }>("/login/webauthn/options", { method: "POST" });

export const webauthnLoginVerify = (flowId: string, response: unknown) =>
  call<{ token: string; expiresAt: string }>("/login/webauthn/verify", { method: "POST", body: { flowId, response } });

/* ---------------- password + TOTP + recovery codes ---------------- */

export const setPassword = (token: string, password: string) => call<{ ok: true }>("/account/password", { method: "POST", token, body: { password } });
export const removePassword = (token: string) => call<{ ok: true }>("/account/password", { method: "DELETE", token });

export const enrollTotp = (token: string) => call<{ secret: string; otpauthUrl: string }>("/account/totp/enroll", { method: "POST", token });
export const confirmTotp = (token: string, code: string) => call<{ recoveryCodes: string[] }>("/account/totp/confirm", { method: "POST", token, body: { code } });
export const disableTotp = (token: string) => call<{ ok: true }>("/account/totp", { method: "DELETE", token });

export const regenerateRecoveryCodes = (token: string) => call<{ recoveryCodes: string[] }>("/account/recovery-codes", { method: "POST", token });

export const passwordLogin = (payload: { handle: string; password: string; code?: string }) =>
  call<{ token?: string; expiresAt?: string; needsTotp?: true }>("/login/password", { method: "POST", body: payload });

/* ---------------- developers: self-service client registration ---------------- */

export interface PartnerApp {
  clientId: string;
  name: string;
  type: "public" | "confidential";
  redirectUris: string[];
  requestedScopes: string[];
  allowedScopes: string[];
  homepage?: string;
  status: "pending" | "approved" | "rejected";
  active: boolean;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  hasSecret: boolean;
  /** Only present in the staff review queue. */
  ownerAccountId?: string;
  ownerHandle?: string;
}

export const listMyApps = (token: string) => orNull<{ apps: PartnerApp[] }>(call<{ apps: PartnerApp[] }>("/developers/apps", { token }));

export const registerApp = (
  token: string,
  payload: { name: string; homepage?: string; type: "public" | "confidential"; redirectUris: string[]; scopes: string[] },
) => call<{ client: PartnerApp; secret?: string }>("/developers/apps", { method: "POST", token, body: payload });

export const getApp = (token: string, clientId: string) => orNull<{ app: PartnerApp }>(call<{ app: PartnerApp }>(`/developers/apps/${encodeURIComponent(clientId)}`, { token }));

export const updateApp = (token: string, clientId: string, patch: { name?: string; homepage?: string; redirectUris?: string[] }) =>
  call<{ app: PartnerApp }>(`/developers/apps/${encodeURIComponent(clientId)}`, { method: "PATCH", token, body: patch });

export const regenerateAppSecret = (token: string, clientId: string) =>
  call<{ secret: string }>(`/developers/apps/${encodeURIComponent(clientId)}/regenerate-secret`, { method: "POST", token });

export const deleteApp = (token: string, clientId: string) =>
  call<Record<string, never>>(`/developers/apps/${encodeURIComponent(clientId)}`, { method: "DELETE", token });

/* ---------------- staff: reviewing partner apps ---------------- */

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

export const staffLogin = (email: string, password: string) =>
  call<{ token: string; expiresAt: string; user: StaffUser }>("/staff/login", { method: "POST", body: { email, password } });

export const staffMe = (token: string) => orNull<{ user: StaffUser }>(call<{ user: StaffUser }>("/staff/me", { token }));

export const listPendingApps = (token: string, status: "pending" | "approved" | "rejected" = "pending") =>
  orNull<{ apps: PartnerApp[] }>(call<{ apps: PartnerApp[] }>(`/staff/partner-apps?status=${status}`, { token }));

export const approveApp = (token: string, clientId: string, scopes?: string[]) =>
  call<{ ok: true }>(`/staff/partner-apps/${encodeURIComponent(clientId)}/approve`, { method: "POST", token, body: scopes ? { scopes } : {} });

export const rejectApp = (token: string, clientId: string, reason: string) =>
  call<{ ok: true }>(`/staff/partner-apps/${encodeURIComponent(clientId)}/reject`, { method: "POST", token, body: { reason } });

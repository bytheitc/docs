// The one place this app talks to portal/api. Nothing else in the app calls fetch.
//
// The portal api is bearer-token based: portal/web holds the token in a cookie and forwards it as
// `Authorization: Bearer <token>`. A native client does the same thing with the token in the
// keychain, so no part of the web's session handling has to be reinvented here.
import Constants from "expo-constants";
import { Platform } from "react-native";

import type {
  Claim,
  Contributor,
  Dashboard,
  LinkedAccount,
  MaintainerMe,
  ProvidersResponse,
  PublicProfile,
} from "./types";

/** What the api's error middleware sends: `{ error: { code, message, fields? } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Per-field messages from a `validation_failed` response, keyed by field name. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuth() {
    return this.status === 401 || this.status === 403;
  }

  get isOffline() {
    return this.status === 0;
  }
}

/**
 * Where the portal api lives.
 *
 * In development the app runs on a phone, which cannot reach the laptop on `localhost`. Expo
 * already knows the laptop's address on the network — it is how the bundle got to the device —
 * so the host is lifted off `hostUri` and only the port is swapped. That makes `npx expo start`
 * work on a real handset with no configuration at all.
 */
/** `extra` is whatever app.json and EAS put there, so nothing in it can be assumed to be a string. */
function configured(key: "portalApiUrl" | "portalWebUrl"): string | null {
  const v = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[key];
  return typeof v === "string" && v ? v.replace(/\/+$/, "") : null;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_PORTAL_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const fromConfig = configured("portalApiUrl");
  if (fromConfig) return fromConfig;

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") return `http://${host}:4006`;

  // Simulator, or the web build served from the dev machine itself.
  return Platform.OS === "android" ? "http://10.0.2.2:4006" : "http://localhost:4006";
}

export const API_URL = resolveBaseUrl();

/** The portal's own web, for the few things that belong in a browser (linking a new account). */
export function portalWebUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_PORTAL_WEB_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return configured("portalWebUrl") ?? API_URL.replace(/:4006$/, ":3006");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = opts;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // A failed fetch is a dead network, a wrong address or a server that isn't up. The app has to
    // be able to tell that apart from "the server said no", so it gets status 0 rather than a throw.
    throw new ApiError(0, "offline", "Can't reach the portal. Check your connection.", undefined);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, "bad_response", "The portal sent something this app could not read.");
  }

  if (!res.ok) {
    const e = (parsed as { error?: { code?: string; message?: string; fields?: Record<string, string> } }).error;
    throw new ApiError(res.status, e?.code ?? "error", e?.message ?? `Request failed (${res.status}).`, e?.fields);
  }
  return parsed as T;
}

/* ---------------------------------------------------------------- auth --- */

export const getProviders = () => request<ProvidersResponse>("/auth/providers");

export const authorize = (input: { provider: string; redirectUri: string; next?: string; user?: string }) =>
  request<{ url: string; state: string; verifier: string; next: string; provider: string }>("/auth/authorize", {
    method: "POST",
    body: input,
  });

export const callback = (input: {
  provider: string;
  code: string;
  redirectUri: string;
  verifier?: string;
  next?: string;
  token?: string | null;
}) =>
  request<{ ok: true; to: string; token?: string; expiresAt?: string }>("/auth/callback", {
    method: "POST",
    body: {
      provider: input.provider,
      code: input.code,
      redirectUri: input.redirectUri,
      verifier: input.verifier,
      next: input.next,
    },
    token: input.token,
  });

export const signOut = (token: string) => request<{ ok: true }>("/auth/signout", { method: "POST", token });

export const signOutEverywhere = (token: string) =>
  request<{ ok: true }>("/auth/signout-all", { method: "POST", token });

/* ------------------------------------------------------------------ me --- */

export const getMe = (token: string) =>
  request<{ contributor: Contributor; accounts: LinkedAccount[] }>("/me", { token });

export const getDashboard = (token: string, signal?: AbortSignal) =>
  request<Dashboard>("/me/dashboard", { token, signal });

export const updateProfile = (
  token: string,
  input: { handle: string; displayName: string } & Partial<PublicProfile>,
) => request<{ ok: true; handle: string; public: boolean }>("/me/profile", { method: "PATCH", body: input, token });

/**
 * Log work you did yourself. Every field here is required by the api: it wants a link a steward
 * can actually open, a sentence of description, and a date that is not in the future. `date` is
 * `YYYY-MM-DD`, and `kind` must be one of SELF_KINDS — the kinds a person may assert about
 * themselves, as opposed to the ones a provider sync produces.
 */
export const logContribution = (
  token: string,
  input: { title: string; description: string; url: string; house: string; kind: string; date: string },
) => request<{ ok: true; id: string }>("/me/contributions", { method: "POST", body: input, token });

export const unlinkAccount = (token: string, provider: string, providerUserId: string) =>
  request<{ ok: true }>(`/me/accounts/${encodeURIComponent(provider)}/${encodeURIComponent(providerUserId)}`, {
    method: "DELETE",
    token,
  });

/**
 * Claim an issue so nobody duplicates the work. `issue` goes over the wire as a string: the api
 * reads every scalar with a helper that rejects non-strings outright, so a number here is a 400.
 */
export const claimIssue = (token: string, input: { provider: string; repo: string; issue: string }) =>
  request<{ ok: true; id: string; assigned: boolean; expiresAt: string }>("/me/claims", {
    method: "POST",
    body: input,
    token,
  });

export const exportMyData = (token: string) => request<Record<string, unknown>>("/me/export", { token });

export const deleteAccount = (token: string, confirm: string) =>
  request<{ ok: true }>("/me", { method: "DELETE", body: { confirm }, token });

/* --------------------------------------------------------- maintainers --- */

export const getMaintainerMe = (token: string) => request<MaintainerMe>("/maintainers/me", { token });

export const respondToInvitation = (token: string, id: string, accept: boolean) =>
  request<{ ok: true }>(`/maintainers/invitations/${encodeURIComponent(id)}/respond`, {
    method: "POST",
    body: { accept },
    token,
  });

export const objectToNomination = (token: string, id: string, note?: string) =>
  request<{ ok: true }>(`/maintainers/nominations/${encodeURIComponent(id)}/object`, {
    method: "POST",
    body: { note },
    token,
  });

export const releaseClaim = (token: string, id: string) =>
  request<{ ok: true }>(`/maintainers/claims/${encodeURIComponent(id)}/release`, { method: "POST", token });

/* ------------------------------------------------------------- claims --- */

/**
 * Hand back a claim you hold. Someone else's claim answers 404, not 403 — the api will not tell
 * you which claim ids exist — so there is nothing useful to say beyond what it returns.
 */
export const releaseOwnClaim = (token: string, id: string) =>
  request<{ ok: true; claim: Claim }>(`/me/claims/${encodeURIComponent(id)}/release`, { method: "POST", token });

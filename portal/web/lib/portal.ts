// This web's client for portal/api. Every call runs on the server and carries the contributor's
// session token as a bearer; nothing here reaches a browser.
import type { Claim, Contribution, Contributor, LinkedAccount, Maintainership, Nomination, People, ReviewerInvitation, SyncRun } from "@/lib/types";
import type { MilestoneDef } from "@/lib/content-types";

const API_URL = (process.env.API_URL ?? "http://localhost:4006").replace(/\/+$/, "");
const TIMEOUT_MS = 8000;

export type Fail = { ok: false; status: number; message: string; errors?: Record<string, string> };
export type Result<T> = ({ ok: true } & T) | Fail;

interface CallOpts {
  method?: string;
  token?: string | null;
  body?: unknown;
  /** Seconds to cache a GET. Omit for no caching (anything personal). */
  revalidate?: number;
  tags?: string[];
}

async function call<T>(path: string, opts: CallOpts = {}): Promise<Result<T>> {
  const { method = "GET", token, body, revalidate, tags } = opts;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(revalidate != null ? { next: { revalidate, tags } } : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!res.ok) {
      const err = parsed.error as { message?: string; fields?: Record<string, string> } | undefined;
      return { ok: false, status: res.status, message: err?.message ?? `The portal answered HTTP ${res.status}.`, errors: err?.fields };
    }
    return { ok: true, ...(parsed as T) };
  } catch (e) {
    console.error(`[web] ${method} ${path} failed: ${(e as Error).message}`);
    return { ok: false, status: 503, message: "The portal service could not be reached." };
  }
}

const orNull = async <T>(p: Promise<Result<T>>): Promise<T | null> => {
  const r = await p;
  return r.ok ? (r as T) : null;
};

/* ---------------- the signed-in contributor ---------------- */

export interface Me { contributor: Contributor; accounts: LinkedAccount[] }
export interface Dashboard extends Me {
  contributions: Contribution[];
  claims: Claim[];
  milestones: { reached: (MilestoneDef & { at: string })[]; next: MilestoneDef[] };
  counted: number;
}

export const getMe = (token: string) => orNull<Me>(call<Me>("/me", { token }));
export const getDashboard = (token: string) => orNull<Dashboard>(call<Dashboard>("/me/dashboard", { token }));
export const exportMyData = (token: string) => call<Record<string, unknown>>("/me/export", { token });

export const updateProfile = (token: string, profile: Record<string, unknown>) =>
  call<{ handle: string; public: boolean }>("/me/profile", { method: "PATCH", token, body: profile });

export const logContribution = (token: string, entry: Record<string, unknown>) =>
  call<{ id: string }>("/me/contributions", { method: "POST", token, body: entry });

export const unlinkAccount = (token: string, provider: string, providerUserId: string) =>
  call<Record<string, never>>(`/me/accounts/${encodeURIComponent(provider)}/${encodeURIComponent(providerUserId)}`, { method: "DELETE", token });

export const deleteMe = (token: string, confirm: string) =>
  call<Record<string, never>>("/me", { method: "DELETE", token, body: { confirm } });

export const claimIssue = (token: string, claim: { provider: string; repo: string; issue: number }) =>
  call<{ assigned: boolean; expiresAt: string; username: string }>("/me/claims", { method: "POST", token, body: claim });

/* ---------------- sign-in ---------------- */

export interface ProviderInfo {
  id: string;
  name: string;
  category: string;
  blurb: string;
  /** Whether this deployment has the settings to sign someone in with it. */
  configured: boolean;
}

export interface ProvidersView {
  providers: ProviderInfo[];
  usable: { id: string; name: string; category: string }[];
  devEnabled: boolean;
}

/** Every provider the portal knows, and which of them work here. Never any client id or secret. */
export async function getProviders(): Promise<ProvidersView> {
  const r = await call<ProvidersView>("/auth/providers", { revalidate: 60, tags: ["providers"] });
  return r.ok ? { providers: r.providers, usable: r.usable, devEnabled: r.devEnabled } : { providers: [], usable: [], devEnabled: false };
}

export const authorize = (payload: { provider: string; next: string; redirectUri: string; user?: string }) =>
  call<{ url: string; state: string; verifier: string; next: string; provider: string }>("/auth/authorize", { method: "POST", body: payload });

export const completeSignIn = (payload: { provider: string; code: string; redirectUri: string; verifier: string; next: string }, token: string | null) =>
  call<{ to: string; token?: string; expiresAt?: string; error?: string }>("/auth/callback", { method: "POST", token, body: payload });

export const signOut = (token: string | null) => call<Record<string, never>>("/auth/signout", { method: "POST", token });
export const signOutEverywhere = (token: string | null) => call<Record<string, never>>("/auth/signout-all", { method: "POST", token });

/* ---------------- public ---------------- */

export interface WallEntry { handle: string; name: string; avatarUrl: string | null; profileUrl: string; joined: string }

/** The opt-in wall, or null when the portal could not be read. An empty wall is `[]`, not null: the
 *  page must never tell visitors that nobody has opted in when the truth is that it couldn't look. */
export const getWall = async (): Promise<WallEntry[] | null> =>
  (await orNull<{ contributors: WallEntry[] }>(call("/public/contributors", { revalidate: 60, tags: ["wall"] })))?.contributors ?? null;

export interface PublicProfileView {
  contributor: { handle: string; name: string; avatarUrl: string | null; bio: string; website: string; joined: string };
  houses: string[] | null;
  accounts: { provider: string; username: string; profileUrl: string | null }[] | null;
  /** Only the display fields, and only when this person switched contributions on. */
  contributions: (Pick<Contribution, "id" | "provider" | "kind" | "title" | "state" | "house" | "occurredAt"> & {
    url: string | null;
    repo: string | null;
    review?: { status: "pending" | "verified" | "declined" };
  })[] | null;
}

export const getPublicProfile = (handle: string) =>
  orNull<PublicProfileView>(call(`/public/contributors/${encodeURIComponent(handle)}`, { revalidate: 60, tags: ["profiles"] }));

/* ---------------- maintainers ---------------- */

export interface MaintainerHome {
  maintainerships: Maintainership[];
  steering: boolean;
  invitations: ReviewerInvitation[];
  nominationsAboutMe: Nomination[];
  nominationsToConsider: Nomination[];
  people: People;
}

export interface RepoGovernance {
  repo: string;
  maintainers: Maintainership[];
  past: Maintainership[];
  nominations: Nomination[];
  people: People;
}

export const getMaintainerHome = (t: string) => orNull<MaintainerHome>(call("/maintainers/me", { token: t }));
export const getRepoGovernance = (t: string, repo: string) =>
  orNull<RepoGovernance>(call(`/maintainers/repos/${repo.split("/").map(encodeURIComponent).join("/")}`, { token: t }));

export const inviteReviewer = (t: string, payload: { repo: string; handle: string; note: string }) =>
  call<Record<string, never>>("/maintainers/invitations", { method: "POST", token: t, body: payload });
export const respondToInvitation = (t: string, id: string, accept: boolean) =>
  call<Record<string, never>>(`/maintainers/invitations/${encodeURIComponent(id)}/respond`, { method: "POST", token: t, body: { accept } });
export const withdrawInvitation = (t: string, id: string) =>
  call<Record<string, never>>(`/maintainers/invitations/${encodeURIComponent(id)}/withdraw`, { method: "POST", token: t });

export const nominate = (t: string, payload: { repo: string; handle: string; issueUrl: string; reason: string }) =>
  call<Record<string, never>>("/maintainers/nominations", { method: "POST", token: t, body: payload });
export const objectToNomination = (t: string, id: string, note: string) =>
  call<Record<string, never>>(`/maintainers/nominations/${encodeURIComponent(id)}/object`, { method: "POST", token: t, body: { note } });
export const withdrawNomination = (t: string, id: string) =>
  call<Record<string, never>>(`/maintainers/nominations/${encodeURIComponent(id)}/withdraw`, { method: "POST", token: t });

export const getMaintainerClaims = (t: string) =>
  orNull<{ claims: Claim[]; people: People }>(call("/maintainers/claims", { token: t }));
export const releaseClaimAsMaintainer = (t: string, id: string) =>
  call<Record<string, never>>(`/maintainers/claims/${encodeURIComponent(id)}/release`, { method: "POST", token: t });

export const stepDown = (t: string, repo: string) =>
  call<Record<string, never>>("/maintainers/step-down", { method: "POST", token: t, body: { repo } });
export const removeMaintainer = (t: string, id: string, note: string) =>
  call<Record<string, never>>(`/maintainers/${encodeURIComponent(id)}/remove`, { method: "POST", token: t, body: { note } });

/* ---------------- staff tools ---------------- */

/** Signs a staff member in with their CMS account, through portal/api. */
export const staffLogin = (email: string, password: string) =>
  call<{ token: string; expiresAt: string; user: { id: string; email: string; name: string; role: "editor" | "publisher" | "admin" } }>(
    "/staff/login",
    { method: "POST", body: { email, password } },
  );

export interface StaffCounts {
  contributors: number;
  publicProfiles: number;
  pendingReviews: number;
  contributions: number;
  unmatched: number;
  activeClaims: number;
  activeSources: number;
  sources: number;
  providersLive: number;
}

/** One platform, as the Providers page needs it. Settings are reported present or missing, never by value. */
export interface StaffProvider {
  id: string;
  name: string;
  category: string;
  blurb: string;
  configured: boolean;
  canSync: boolean;
  signInSettings: { name: string; set: boolean }[];
  syncSettings: { name: string; set: boolean }[];
  setup: string[];
  tested: string;
}

export interface StaffSource {
  id: string;
  label: string;
  provider: string;
  house: string;
  active: boolean;
}

export const staff = {
  overview: (t: string) => call<{ counts: StaffCounts; recentRuns: SyncRun[]; you: { id: string; email: string; name: string; role: "editor" | "publisher" | "admin" } }>("/staff/overview", { token: t }),
  contributors: (t: string) => call<{ contributors: Contributor[] }>("/staff/contributors", { token: t }),
  contributor: (t: string, id: string) => call<{ contributor: Contributor; accounts: LinkedAccount[]; contributions: Contribution[]; claims: Claim[] }>(`/staff/contributors/${encodeURIComponent(id)}`, { token: t }),
  setDisabled: (t: string, id: string, disabled: boolean) => call<Record<string, never>>(`/staff/contributors/${encodeURIComponent(id)}`, { method: "PATCH", token: t, body: { disabled } }),
  contributions: (t: string, q: Record<string, string> = {}) => call<{ contributions: Contribution[] }>(`/staff/contributions?${new URLSearchParams(q)}`, { token: t }),
  review: (t: string, id: string, review: "verified" | "declined", note?: string) => call<Record<string, never>>(`/staff/contributions/${encodeURIComponent(id)}`, { method: "PATCH", token: t, body: { review, note } }),
  setHidden: (t: string, id: string, hidden: boolean) => call<Record<string, never>>(`/staff/contributions/${encodeURIComponent(id)}`, { method: "PATCH", token: t, body: { hidden } }),
  claims: (t: string, status?: string) => call<{ claims: Claim[] }>(`/staff/claims${status ? `?status=${status}` : ""}`, { token: t }),
  releaseClaim: (t: string, id: string) => call<Record<string, never>>(`/staff/claims/${encodeURIComponent(id)}/release`, { method: "POST", token: t }),
  sync: (t: string) => call<{ sources: StaffSource[]; runs: SyncRun[]; syncable: string[] }>("/staff/sync", { token: t }),
  runSync: (t: string, source: string) => call<{ runs: SyncRun[] }>("/staff/sync", { method: "POST", token: t, body: { source } }),
  providers: (t: string) => call<{ callbackBase: string; devEnabled: boolean; providers: StaffProvider[] }>("/staff/providers", { token: t }),
  maintainers: (t: string) => call<{ maintainerships: Maintainership[]; nominations: Nomination[]; people: People }>("/staff/maintainers", { token: t }),
  seatMaintainer: (t: string, payload: { handle: string; role: string; repo?: string }) =>
    call<Record<string, never>>("/staff/maintainers", { method: "POST", token: t, body: payload }),
  unseatMaintainer: (t: string, id: string, note: string) =>
    call<Record<string, never>>(`/staff/maintainers/${encodeURIComponent(id)}/end`, { method: "POST", token: t, body: { note } }),
  audit: (t: string) => call<{ events: { at: string; actor: string; action: string; target?: string; detail?: string }[] }>("/staff/audit", { token: t }),
};

// The provider-adapter interface. Every platform a contributor can connect is one file in lib/providers/
// that exports a ProviderAdapter. Add a provider by writing an adapter and listing it in lib/providers/index.ts.
//
// Privacy (amānah): adapters ask for identity-only scopes. The access token returned by sign-in is used once,
// inside `profile()`, and is never stored. Contribution sync uses org-level credentials set by admins in the
// environment (or public APIs), never a contributor's token.
import type { HouseId } from "@/lib/houses";

export type ProviderCategory = "code" | "ml" | "research" | "writing" | "translation" | "dev";

export type ContributionKind =
  | "pr" | "merge-request" | "commit" | "issue" | "review"
  | "model" | "dataset" | "space"
  | "work" | "edit" | "translation"
  | "writing" | "design" | "teaching" | "other";

export const CONTRIBUTION_KINDS: ContributionKind[] = [
  "pr", "merge-request", "commit", "issue", "review", "model", "dataset", "space", "work", "edit", "translation",
  "writing", "design", "teaching", "other",
];

export type ContributionState = "open" | "merged" | "closed" | "published" | "approved";

/** Who a contribution belongs to on the provider. Matched against linked accounts (id first, then username). */
export interface ProviderAuthor {
  id?: string;
  username?: string;
}

/** What every adapter's `sync` returns. Storage adds ids, matching and timestamps. */
export interface NormalisedContribution {
  provider: string;
  /** Stable id on the provider, unique per provider. Upserts key on (provider, providerContributionId). */
  providerContributionId: string;
  kind: ContributionKind;
  title: string;
  url: string;
  /** Repository, project, model id or wiki page this belongs to. */
  repo?: string;
  state: ContributionState;
  author: ProviderAuthor;
  occurredAt: Date;
  house: HouseId;
}

/** The identity we keep after sign-in. Nothing else from the provider is stored. */
export interface ProviderProfile {
  providerUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  profileUrl?: string;
}

/** A tracked source, as admins configure it in the CMS (collection `sources`). */
export interface TrackedSource {
  id: string;
  label: string;
  provider: string;
  /** Organisation, group, user or wiki domain, depending on the provider. */
  owner: string;
  /** Optional: a single repository / project / model id. */
  repo?: string;
  /** Optional: wiki page titles (Wikimedia), separated by "|". */
  page?: string;
  /** Optional: API base URL for self-hosted instances (GitLab, Forgejo) or a wiki's domain. */
  baseUrl?: string;
  house: HouseId;
  active: boolean;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  /** Whether to send a PKCE S256 challenge. */
  pkce: boolean;
  /** How the client authenticates at the token endpoint. */
  tokenAuth: "body" | "basic";
  extraAuthorizeParams?: Record<string, string>;
}

/** The token endpoint's JSON. Some providers (ORCID) put the identity in here. Never persisted. */
export type TokenResponse = Record<string, unknown> & { access_token?: string };

export interface SyncContext {
  fetch: FetchLike;
  env: Record<string, string | undefined>;
  /** Linked accounts for this provider. Used by per-person providers (ORCID) whose public data is fetched by identifier. */
  linkedAccounts: { providerUserId: string; username: string }[];
}

export interface ProviderAdapter {
  id: string;
  name: string;
  category: ProviderCategory;
  /** One sentence for the sign-in and connections pages. */
  blurb: string;
  /** Env vars needed for sign-in. The provider only appears when all are set. */
  envVars: string[];
  /** Optional env vars used by sync (org-level credentials). */
  syncEnvVars?: string[];
  /** Setup steps shown to admins on the Providers page. `{callback}` is replaced with the callback URL. */
  setup: string[];
  /** What the adapter has and hasn't been verified against. Shown to admins. */
  tested: string;
  /** Whether a source may leave `owner` empty (sync from linked accounts instead). */
  ownerOptional?: boolean;
  oauth(env: Record<string, string | undefined>): OAuthConfig | null;
  profile(token: TokenResponse, ctx: { fetch: FetchLike; env: Record<string, string | undefined> }): Promise<ProviderProfile>;
  sync?(source: TrackedSource, since: Date | null, ctx: SyncContext): Promise<NormalisedContribution[]>;
}

/* ------------------------------------------------------------------ */
/* Small shared helpers (pure, no imports, so the test runner can load them) */
/* ------------------------------------------------------------------ */

export class ProviderError extends Error {}

export async function getJson<T>(fetch: FetchLike, url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "itc-portal", ...headers }, cache: "no-store" });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    throw new ProviderError(`${res.status} from ${new URL(url).host}${body ? `: ${body}` : ""}`);
  }
  return (await res.json()) as T;
}

export const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
export const optStr = (v: unknown): string | undefined => str(v) || undefined;

/** Only http(s) URLs are kept; anything else (javascript:, data:) is dropped. */
export function safeUrl(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Plain text only: strips tags and control characters, collapses whitespace, caps length. */
export function plain(v: unknown, max = 300): string {
  return str(v).replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export const trimSlash = (s: string) => s.replace(/\/+$/, "");

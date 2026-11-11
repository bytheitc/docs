// The portal's shapes, as portal/api sends them. The data itself lives in portal/api's database;
// this side only renders it, so nothing here knows how it is stored.
import type { HouseId } from "@/lib/houses";
import type { ContributionKind, ContributionState } from "@/lib/provider-types";

export interface PublicProfile {
  /** Master switch: nothing is public unless this is true. */
  public: boolean;
  bio: string;
  website: string;
  showHouses: boolean;
  showAccounts: boolean;
  showContributions: boolean;
  /** Listed on /contributors (requires `public`). */
  onWall: boolean;
}

export const DEFAULT_PROFILE: PublicProfile = {
  public: false, bio: "", website: "", showHouses: true, showAccounts: false, showContributions: false, onWall: false,
};

export interface Contributor {
  id: string;
  /** URL-safe, unique; used for /u/[handle]. */
  handle: string;
  displayName: string;
  avatarUrl?: string;
  profile: PublicProfile;
  createdAt: string;
  disabled?: boolean;
}

/** A linked provider identity. Never holds a token. */
export interface LinkedAccount {
  contributorId: string;
  provider: string;
  providerUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  profileUrl?: string;
  linkedAt: string;
}

export interface ContributorSession {
  tokenHash: string;
  contributorId: string;
  expiresAt: string;
  createdAt: string;
}

export type ReviewStatus = "pending" | "verified" | "declined";

export interface Contribution {
  id: string;
  /** Provider id, or "self" for self-logged work. */
  provider: string;
  /** Unique per provider. Self-logged entries use their own id. */
  providerContributionId: string;
  kind: ContributionKind;
  title: string;
  url?: string;
  repo?: string;
  state: ContributionState;
  house: HouseId;
  occurredAt: string;
  /** Provider author (synced only). Kept so unmatched work attaches when the person links later. */
  authorId?: string;
  authorUsername?: string;
  /** null while no linked account matches. */
  contributorId: string | null;
  sourceId?: string;
  hidden?: boolean;
  /** Self-logged only. */
  description?: string;
  review?: { status: ReviewStatus; by?: string; at?: string; note?: string };
  createdAt: string;
  updatedAt: string;
}

export type ClaimStatus = "active" | "released" | "expired";

export interface Claim {
  id: string;
  provider: string;
  repo: string;
  issue: number;
  contributorId: string;
  username: string;
  status: ClaimStatus;
  createdAt: string;
  expiresAt: string;
  /** True when the issue was assigned on the provider. */
  assigned: boolean;
  releasedBy?: string;
  releasedAt?: string;
}

export interface SyncRun {
  id: string;
  sourceId: string;
  provider: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "ok" | "error";
  counts: { fetched: number; created: number; updated: number; matched: number };
  errors: string[];
  by: string | null;
}

export interface UpsertResult { created: number; updated: number }

/**
 * The portal's own audit log. Staff actions on portal data are recorded here rather than in the CMS,
 * because this api owns the data they change (ARCHITECTURE.md, rule 2).
 */
export interface AuditEvent {
  at: Date;
  /** The CMS account that acted, by email. */
  actor: string;
  action: string;
  target?: string;
  detail?: string;
}

export interface ContributionFilter {
  contributorId?: string;
  provider?: string;
  kind?: string;
  house?: string;
  reviewStatus?: ReviewStatus;
  includeHidden?: boolean;
  unmatchedOnly?: boolean;
  limit?: number;
}

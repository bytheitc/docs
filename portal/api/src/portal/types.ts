// Portal data model. Stored in the portal's own database (itc_portal), in collections prefixed `portal_`.
import type { HouseId } from "../content/houses.js";
import type { ContributionKind, ContributionState } from "../providers/types.js";
import type { Maintainership, Nomination, NominationStatus, ReviewerInvitation } from "./maintainers.js";

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
  createdAt: Date;
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
  linkedAt: Date;
}

export interface ContributorSession {
  tokenHash: string;
  contributorId: string;
  expiresAt: Date;
  createdAt: Date;
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
  occurredAt: Date;
  /** Provider author (synced only). Kept so unmatched work attaches when the person links later. */
  authorId?: string;
  authorUsername?: string;
  /** null while no linked account matches. */
  contributorId: string | null;
  sourceId?: string;
  hidden?: boolean;
  /** Self-logged only. */
  description?: string;
  review?: { status: ReviewStatus; by?: string; at?: Date; note?: string };
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  expiresAt: Date;
  /** True when the issue was assigned on the provider. */
  assigned: boolean;
  releasedBy?: string;
  releasedAt?: Date;
}

export interface SyncRun {
  id: string;
  sourceId: string;
  provider: string;
  startedAt: Date;
  finishedAt?: Date;
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

/** The one seam every database must implement for portal data (Mongo today; others later). */
export interface PortalStore {
  readonly kind: string;

  // contributors
  createContributor(c: Contributor): Promise<void>;
  getContributor(id: string): Promise<Contributor | null>;
  getContributorByHandle(handle: string): Promise<Contributor | null>;
  listContributors(opts?: { publicWall?: boolean }): Promise<Contributor[]>;
  updateContributor(id: string, patch: Partial<Omit<Contributor, "id" | "createdAt">>): Promise<void>;
  /** Deletes the contributor with their accounts, sessions, claims and contributions. */
  deleteContributor(id: string): Promise<void>;

  // linked accounts
  getAccount(provider: string, providerUserId: string): Promise<LinkedAccount | null>;
  listAccounts(contributorId: string): Promise<LinkedAccount[]>;
  listAccountsByProvider(provider: string): Promise<LinkedAccount[]>;
  /** Throws AccountTakenError if the identity is linked to someone else. */
  linkAccount(a: LinkedAccount): Promise<void>;
  unlinkAccount(contributorId: string, provider: string, providerUserId: string): Promise<void>;

  // sessions
  createSession(s: ContributorSession): Promise<void>;
  getSession(tokenHash: string): Promise<ContributorSession | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessions(contributorId: string): Promise<void>;

  // contributions
  upsertContributions(items: Omit<Contribution, "id" | "createdAt" | "updatedAt" | "contributorId">[], match: (author: { id?: string; username?: string }, provider: string) => string | null): Promise<UpsertResult & { matched: number }>;
  addContribution(c: Contribution): Promise<void>;
  getContribution(id: string): Promise<Contribution | null>;
  listContributions(f: ContributionFilter): Promise<Contribution[]>;
  updateContribution(id: string, patch: Partial<Pick<Contribution, "hidden" | "review">>): Promise<void>;
  /** Attaches unmatched synced work by this identity to a contributor. Returns how many attached. */
  attachContributions(provider: string, author: { id: string; username: string }, contributorId: string): Promise<number>;
  detachContributions(provider: string, author: { id: string; username: string }, contributorId: string): Promise<void>;
  countContributions(f?: ContributionFilter): Promise<number>;

  // claims
  /** Throws ClaimTakenError when an active claim exists. Expired claims are marked first. */
  createClaim(c: Claim): Promise<void>;
  listClaims(opts?: { contributorId?: string; status?: ClaimStatus }): Promise<Claim[]>;
  releaseClaim(id: string, by: string): Promise<Claim | null>;
  markClaimAssigned(id: string): Promise<void>;
  /** Marks every active claim past its date as expired. Returns the ones it changed. */
  expireClaims(): Promise<Claim[]>;

  // sync runs
  addSyncRun(r: SyncRun): Promise<void>;
  updateSyncRun(id: string, patch: Partial<SyncRun>): Promise<void>;
  listSyncRuns(opts?: { sourceId?: string; limit?: number }): Promise<SyncRun[]>;
  lastSuccessfulRun(sourceId: string): Promise<SyncRun | null>;

  // maintainers (the governance path: nominate, object, carry by silence)
  listMaintainerships(opts: { contributorId?: string; repo?: string; includeEnded?: boolean }): Promise<Maintainership[]>;
  getMaintainership(id: string): Promise<Maintainership | null>;
  addMaintainership(m: Maintainership): Promise<void>;
  endMaintainership(id: string, patch: Pick<Maintainership, "endedAt" | "endedReason"> & { endedNote?: string }): Promise<void>;
  /** Maintainerships in force that have seen no work on their repo since `before`. */
  staleMaintainerships(before: Date): Promise<Maintainership[]>;

  addNomination(n: Nomination): Promise<void>;
  getNomination(id: string): Promise<Nomination | null>;
  listNominations(opts?: { repo?: string; candidateId?: string; status?: NominationStatus }): Promise<Nomination[]>;
  updateNomination(id: string, patch: Partial<Nomination>): Promise<void>;
  /** Open nominations whose objection window has closed. */
  dueNominations(now: Date): Promise<Nomination[]>;

  addInvitation(i: ReviewerInvitation): Promise<void>;
  getInvitation(id: string): Promise<ReviewerInvitation | null>;
  listInvitations(opts: { contributorId?: string; repo?: string; status?: string }): Promise<ReviewerInvitation[]>;
  updateInvitation(id: string, patch: Partial<ReviewerInvitation>): Promise<void>;

  /** When this contributor last did anything on this repo, for the six-month rule. */
  lastContributionAt(contributorId: string, repo: string): Promise<Date | null>;

  // audit log
  addAudit(ev: AuditEvent): Promise<void>;
  listAudit(opts?: { limit?: number }): Promise<AuditEvent[]>;
}

export class AccountTakenError extends Error {
  constructor() { super("That account is already linked to another contributor."); }
}
export class ClaimTakenError extends Error {
  constructor() { super("Someone has already claimed this issue."); }
}

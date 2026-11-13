// Mirrors portal/api/src/portal/types.ts over the wire. Dates arrive as ISO strings — the api
// serialises them with JSON.stringify — so they are typed as strings here and parsed at the edge.

export type HouseId = "site" | "ai" | "engineering" | "health" | "institute" | "oss" | "research";

export interface PublicProfile {
  /** Master switch: nothing is public unless this is true. */
  public: boolean;
  bio: string;
  website: string;
  showHouses: boolean;
  showAccounts: boolean;
  showContributions: boolean;
  /** Listed on the contributors wall. Requires `public`. */
  onWall: boolean;
}

export const DEFAULT_PROFILE: PublicProfile = {
  public: false,
  bio: "",
  website: "",
  showHouses: true,
  showAccounts: false,
  showContributions: false,
  onWall: false,
};

export interface Contributor {
  id: string;
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

export type ReviewStatus = "pending" | "verified" | "declined";

export interface Contribution {
  id: string;
  provider: string;
  providerContributionId: string;
  kind: string;
  title: string;
  url?: string;
  repo?: string;
  state: string;
  house: HouseId;
  occurredAt: string;
  contributorId: string | null;
  hidden?: boolean;
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
  /** True when the issue was actually assigned on the provider. */
  assigned: boolean;
  releasedBy?: string;
  releasedAt?: string;
}

/** A milestone as the CMS defines it. */
export interface MilestoneDef {
  id: string;
  title: string;
  description: string;
  rule: string;
  threshold: number;
  kind?: string;
}

/** A milestone that has been reached, with the date it was. */
export type ReachedMilestone = MilestoneDef & { at: string };

export interface Dashboard {
  contributor: Contributor;
  accounts: LinkedAccount[];
  contributions: Contribution[];
  claims: Claim[];
  milestones: { reached: ReachedMilestone[]; next: MilestoneDef[] };
  /** Contributions that count toward milestones — not every row above does. */
  counted: number;
}

export interface Provider {
  id: string;
  name: string;
  category?: string;
  blurb?: string;
  configured?: boolean;
}

export interface ProvidersResponse {
  providers: Provider[];
  usable: Provider[];
  devEnabled: boolean;
}

/**
 * What `GET /maintainers/me` returns. Note the two separate nomination lists: the api already
 * excludes the ones you may not object to (your own, and ones about you), so `nominationsToConsider`
 * is exactly the set waiting on your judgement. `invitations` is already filtered to open ones.
 * `people` maps contributor ids to handles, since the lists carry ids.
 */
export interface MaintainerMe {
  maintainerships: Maintainership[];
  steering: boolean;
  invitations: ReviewerInvitation[];
  nominationsAboutMe: Nomination[];
  nominationsToConsider: Nomination[];
  people: Record<string, string>;
}

export interface Maintainership {
  id: string;
  contributorId: string;
  repo: string;
  provider: string;
  role: string;
  since: string;
  /** Who brought them in, or null when staff or the steering group did. */
  by: string | null;
  endedAt?: string;
  endedReason?: "emeritus" | "removed" | "stepped-down";
}

export interface ReviewerInvitation {
  id: string;
  repo: string;
  provider: string;
  contributorId: string;
  invitedBy: string;
  note: string;
  createdAt: string;
  status: string;
  respondedAt?: string;
}

export interface Nomination {
  id: string;
  repo: string;
  provider: string;
  candidateId: string;
  nominatedBy: string;
  /** Governance requires the nomination to be made in the open; this is where. */
  issueUrl: string;
  reason: string;
  openedAt: string;
  /** When it carries, if nobody objects before then. */
  closesAt: string;
  status: string;
  objections: { by: string; note?: string; at: string }[];
  decidedAt?: string;
}

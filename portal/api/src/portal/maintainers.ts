// The maintainer path, exactly as the Open Source governance page describes it.
//
//   "There is no application form and no quota. Maintainers are nominated for work already done."
//
//   1. An existing maintainer invites you to be a reviewer. You review PRs for a while.
//   2. A maintainer nominates you in a public issue in that repo, linking to your work.
//   3. Existing maintainers of the repo have seven days to object. No objection means you're in.
//
//   "Maintainers who are inactive for six months are moved to emeritus with thanks. Coming back is
//    one message away. Maintainer rights can also be removed by the steering group for breaches of
//    the code of conduct."
//
// So there is nothing here that accepts an application, and nothing that scores anyone. A nomination
// carries by silence, which is why the objection window is a date this api watches rather than a
// button someone has to remember to press.

/** `repo` is "owner/name" on the provider, except for steering, which is collective-wide ("*"). */
export const ANY_REPO = "*";

export type MaintainerRole = "reviewer" | "maintainer" | "emeritus" | "steering";

/** Seven days, from the governance page. */
export const OBJECTION_DAYS = 7;
/** Six months, from the governance page. */
export const INACTIVE_MONTHS = 6;

export interface Maintainership {
  id: string;
  contributorId: string;
  repo: string;
  provider: string;
  role: MaintainerRole;
  since: Date;
  /** The contributor who brought them in, or null when staff or the steering group did. */
  by: string | null;
  endedAt?: Date;
  endedReason?: "emeritus" | "removed" | "stepped-down";
  /** Why rights were removed. Only the steering group can set this. */
  endedNote?: string;
}

export type NominationStatus = "open" | "carried" | "objected" | "withdrawn";

export interface Objection {
  by: string;
  at: Date;
  note: string;
}

export interface Nomination {
  id: string;
  repo: string;
  provider: string;
  /** The contributor being nominated. */
  candidateId: string;
  nominatedBy: string;
  /** The public issue the nomination was made in. Governance requires it to be in the open. */
  issueUrl: string;
  reason: string;
  openedAt: Date;
  closesAt: Date;
  status: NominationStatus;
  objections: Objection[];
  decidedAt?: Date;
}

export type InvitationStatus = "open" | "accepted" | "declined" | "withdrawn";

export interface ReviewerInvitation {
  id: string;
  repo: string;
  provider: string;
  contributorId: string;
  invitedBy: string;
  note: string;
  createdAt: Date;
  status: InvitationStatus;
  respondedAt?: Date;
}

/** "owner/name", the same shape a claim uses. */
export const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

export const isRepo = (v: string) => REPO.test(v);

/** A maintainership that is currently in force. */
export const inForce = (m: Maintainership) => !m.endedAt;

/** Whether someone may act as a maintainer of this repo: maintainers and the steering group. */
export function maintains(mine: Maintainership[], repo: string): boolean {
  return mine.some((m) => inForce(m) && ((m.role === "maintainer" && m.repo === repo) || (m.role === "steering" && m.repo === ANY_REPO)));
}

export const isSteering = (mine: Maintainership[]) =>
  mine.some((m) => inForce(m) && m.role === "steering" && m.repo === ANY_REPO);

export const closesAfter = (from: Date, days = OBJECTION_DAYS) => new Date(from.getTime() + days * 864e5);

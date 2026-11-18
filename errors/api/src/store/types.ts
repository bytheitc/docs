import type { StoredEvent } from "../event.js";

export type IssueStatus = "unresolved" | "resolved" | "ignored";

export interface Project {
  id: string;
  slug: string;
  name: string;
  /** The DSN's public key. Public on purpose: browsers embed it. It authorizes sending, nothing else. */
  publicKey: string;
  createdAt: Date;
  createdBy: string;
}

export interface Issue {
  id: string;
  projectId: string;
  fingerprint: string;
  title: string;
  culprit: string;
  level: string;
  status: IssueStatus;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  lastEventId: string;
  environments: string[];
  releases: string[];
  /** When an alert last went out for this issue, so a flapping error can't flood the channel. */
  lastAlertAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/** What happened to the issue when an event landed on it. */
export type IngestOutcome = "new" | "regression" | "existing" | "ignored";

export interface IssueQuery {
  projectId?: string;
  status?: IssueStatus | "all";
  search?: string;
  limit?: number;
}

export interface ErrorsStore {
  createProject(p: Project): Promise<boolean>;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  getProjectBySlug(slug: string): Promise<Project | null>;

  /**
   * Records one event atomically: creates its issue or bumps the existing one, reopens it when it was
   * resolved (a regression), and keeps the newest `keepPerIssue` events.
   */
  ingest(projectId: string, fingerprint: string, event: StoredEvent, opts: { keepPerIssue: number; retentionDays: number }): Promise<{ issue: Issue; outcome: IngestOutcome }>;
  /** Claims the right to alert on an issue: true at most once per cooldown, across every instance. */
  claimAlert(issueId: string, cooldownMs: number, now?: Date): Promise<boolean>;

  listIssues(q: IssueQuery): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | null>;
  setIssueStatus(id: string, status: IssueStatus, by: string): Promise<Issue | null>;
  listEvents(issueId: string, limit: number): Promise<StoredEvent[]>;
  getEvent(issueId: string, eventId: string): Promise<StoredEvent | null>;
  /** Events per day for one issue, oldest first, for the sparkline. */
  dailyCounts(issueId: string, days: number): Promise<{ day: string; count: number }[]>;
  /** Releases connections (tests, scripts). */
  close(): Promise<void>;
}

// ITC native CMS: core types.
// This file is identical in every house's app (kept in sync, like the Khatam mark).
// It is also the seed of a future standalone CMS, so nothing here may depend on house content.

/* ------------------------------------------------------------------ */
/* Fields: the schema language collections are described in            */
/* ------------------------------------------------------------------ */

interface FieldBase {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Show (and validate) this field only when a sibling field has one of the given values. */
  showWhen?: { field: string; equals: string | readonly string[] };
}

/** Whether a field applies, given the values of its sibling fields. */
export function fieldApplies(f: { showWhen?: { field: string; equals: string | readonly string[] } }, siblings: Record<string, unknown> | undefined): boolean {
  if (!f.showWhen) return true;
  const v = siblings?.[f.showWhen.field];
  const want = f.showWhen.equals;
  return typeof want === "string" ? v === want : want.includes(String(v ?? ""));
}

export type Field =
  | (FieldBase & { type: "text" | "email" | "url" | "date"; placeholder?: string })
  | (FieldBase & { type: "textarea"; rows?: number })
  | (FieldBase & { type: "number"; min?: number; max?: number })
  | (FieldBase & { type: "boolean" })
  | (FieldBase & { type: "select"; options: readonly string[] })
  /** An ordered list of paragraphs (string[]). */
  | (FieldBase & { type: "paragraphs" })
  /** A short list of strings edited as one comma-separated line (string[]). */
  | (FieldBase & { type: "tags" })
  /** A list of strings, one per line (string[]). */
  | (FieldBase & { type: "lines" })
  /** A nested object. */
  | (FieldBase & { type: "object"; fields: Field[] })
  /** A repeatable list of nested objects. `itemTitle` names the field used as each row's heading. */
  | (FieldBase & { type: "list"; fields: Field[]; itemLabel?: string; itemTitle?: string })
  /** The id of an entry in another collection. */
  | (FieldBase & { type: "relation"; collection: string; multiple?: boolean });

export type FieldType = Field["type"];

/** An extra admin page an app adds to the sidebar (exported from lib/cms/collections.ts as ADMIN_LINKS). */
export interface AdminLink {
  href: string;
  label: string;
  /** Minimum role that sees the link. Defaults to editor. */
  role?: "editor" | "publisher" | "admin";
}

/* ------------------------------------------------------------------ */
/* Collections                                                        */
/* ------------------------------------------------------------------ */

export interface CollectionDef<T = Record<string, unknown>> {
  /** Machine name, used in URLs and storage. */
  name: string;
  label: string;
  singular: string;
  description?: string;
  /** Which field holds the entry's unique id (slug or identifier). */
  idField: string;
  /** Which field is shown as the entry's title. */
  titleField: string;
  /** Extra fields shown as columns in the admin list. */
  columns?: string[];
  fields: Field[];
  /** Built-in content used to seed an empty database, and as a read-only fallback with no database. */
  seed: () => T[];
  /** If true, the collection holds exactly one entry (a settings-style document). */
  singleton?: boolean;
}

/* ------------------------------------------------------------------ */
/* Stored records                                                     */
/* ------------------------------------------------------------------ */

/** Workflow states. Shūrā: an editor drafts and submits; a publisher publishes. */
export type Status = "draft" | "review" | "published" | "archived";
export const STATUSES: Status[] = ["draft", "review", "published", "archived"];

export interface Entry<T = Record<string, unknown>> {
  collection: string;
  id: string;
  status: Status;
  position: number;
  data: T;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
  /** Changes to a published entry, waiting for a publisher. The live `data` is untouched until then. */
  pending?: PendingChange | null;
}

export interface PendingChange {
  data: Record<string, unknown>;
  by: string | null;
  at: Date;
}

export interface Revision {
  collection: string;
  entryId: string;
  status: Status;
  data: Record<string, unknown>;
  author: string | null;
  at: Date;
  note?: string;
}

export type Role = "editor" | "publisher" | "admin";
export const ROLES: Role[] = ["editor", "publisher", "admin"];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  createdAt: Date;
  disabled?: boolean;
}

export interface Session {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export type SubmissionStatus = "new" | "in-progress" | "done" | "spam";
export const SUBMISSION_STATUSES: SubmissionStatus[] = ["new", "in-progress", "done", "spam"];

export interface Submission {
  id: string;
  form: string;
  data: Record<string, string>;
  status: SubmissionStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEvent {
  at: Date;
  actor: string | null;
  action: string;
  target?: string;
  detail?: string;
}

/* ------------------------------------------------------------------ */
/* Storage adapter: the one seam every database must implement        */
/* ------------------------------------------------------------------ */

export interface StorageAdapter {
  readonly kind: string;

  // entries
  listEntries(collection: string, opts?: { status?: Status[] }): Promise<Entry[]>;
  getEntry(collection: string, id: string): Promise<Entry | null>;
  countEntries(collection: string): Promise<number>;
  maxPosition(collection: string): Promise<number>;
  /** Throws `DuplicateIdError` if the id is taken. */
  createEntry(entry: Entry): Promise<void>;
  /** Replaces data/status/position; `newId` renames the entry. Throws `DuplicateIdError` on clash. */
  updateEntry(
    collection: string,
    id: string,
    patch: Partial<Pick<Entry, "data" | "status" | "position" | "updatedBy" | "pending">> & { newId?: string },
  ): Promise<void>;
  deleteEntry(collection: string, id: string): Promise<void>;
  /** Inserts the given entries only if the collection is empty. Safe to call concurrently. */
  seedIfEmpty(collection: string, entries: Entry[]): Promise<boolean>;

  // revisions
  addRevision(rev: Revision): Promise<void>;
  listRevisions(collection: string, entryId: string, limit?: number): Promise<Revision[]>;

  // users and sessions
  countUsers(): Promise<number>;
  listUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<void>;
  updateUser(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<void>;
  createSession(session: Session): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  // form submissions (the inbox)
  addSubmission(sub: Submission): Promise<void>;
  listSubmissions(opts?: { form?: string; status?: SubmissionStatus }): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | null>;
  updateSubmission(id: string, patch: Partial<Pick<Submission, "status" | "note">>): Promise<void>;
  countSubmissions(opts?: { status?: SubmissionStatus }): Promise<number>;

  // audit log
  addAudit(ev: AuditEvent): Promise<void>;
  listAudit(limit?: number): Promise<AuditEvent[]>;
}

export class DuplicateIdError extends Error {
  constructor(public readonly collection: string, public readonly id: string) {
    super(`An entry with id "${id}" already exists in ${collection}.`);
  }
}

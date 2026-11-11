// ITC CMS service: core types.
// Ported from the per-app kit (lib/cms/types.ts) with one addition: every stored record carries a `space`
// (the house id that owns it). The schema language (Field, CollectionDef) is the contract the houses register in.

/* ------------------------------------------------------------------ */
/* Fields: the schema language collections are described in            */
/* ------------------------------------------------------------------ */

export interface ShowWhen {
  field: string;
  equals: string | readonly string[];
}

interface FieldBase {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Show (and validate) this field only when a sibling field has one of the given values. */
  showWhen?: ShowWhen;
}

/** Whether a field applies, given the values of its sibling fields. */
export function fieldApplies(f: { showWhen?: ShowWhen }, siblings: Record<string, unknown> | undefined): boolean {
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
  /** The id of an entry in another collection of the same space. */
  | (FieldBase & { type: "relation"; collection: string; multiple?: boolean });

export type FieldType = Field["type"];
export const FIELD_TYPES: FieldType[] = [
  "text", "email", "url", "date", "textarea", "number", "boolean", "select",
  "paragraphs", "tags", "lines", "object", "list", "relation",
];

/* ------------------------------------------------------------------ */
/* Collections and spaces                                             */
/* ------------------------------------------------------------------ */

export interface CollectionDef {
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
  /** If true, the collection holds exactly one entry (a settings-style document). */
  singleton?: boolean;
}

/** A collection as registered over HTTP: the definition plus its seed content as a JSON array. */
export interface CollectionInput extends CollectionDef {
  seed?: Record<string, unknown>[];
}

export type Role = "editor" | "publisher" | "admin";
export const ROLES: Role[] = ["editor", "publisher", "admin"];

/** An extra page the space's sidebar links to (for example the portal's staff tools). */
export interface SpaceLink {
  href: string;
  label: string;
  /** Minimum role that sees the link. Defaults to editor. */
  role?: Role;
}

/** What a house registers with PUT /v1/spaces/:space/schema (seed arrays are used once and not stored). */
export interface SpaceSchemaInput {
  label: string;
  title: string;
  collections: CollectionInput[];
  forms: Record<string, string>;
  links: SpaceLink[];
  webhook: { url: string } | null;
}

/** A registered space, as stored in `cms_spaces`. */
export interface SpaceRecord {
  id: string;
  label: string;
  title: string;
  collections: CollectionDef[];
  forms: Record<string, string>;
  links: SpaceLink[];
  webhook: { url: string } | null;
  /** sha256 of the registered schema (including seeds), to tell a real change from a re-registration. */
  hash: string;
  /** When each collection was seeded. A collection is seeded once, while empty. */
  seeded: Record<string, Date>;
  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------------------------------------------ */
/* Stored records                                                     */
/* ------------------------------------------------------------------ */

/** Workflow states. Shūrā: an editor drafts and submits; a publisher publishes. */
export type Status = "draft" | "review" | "published" | "archived";
export const STATUSES: Status[] = ["draft", "review", "published", "archived"];

export interface Entry {
  space: string;
  collection: string;
  id: string;
  status: Status;
  position: number;
  data: Record<string, unknown>;
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
  space: string;
  collection: string;
  entryId: string;
  status: Status;
  data: Record<string, unknown>;
  author: string | null;
  at: Date;
  note?: string;
}

/** "*" means every space. Admins always have "*". */
export type SpaceAccess = "*" | string[];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  spaces: SpaceAccess;
  passwordHash: string;
  createdAt: Date;
  disabled?: boolean;
}

/** A user as the API returns it: never the password hash. */
export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export type SubmissionStatus = "new" | "in-progress" | "done" | "spam";
export const SUBMISSION_STATUSES: SubmissionStatus[] = ["new", "in-progress", "done", "spam"];

export interface Submission {
  space: string;
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
  /** The space the event belongs to; null for account-level events (sign-in, users). */
  space: string | null;
  actor: string | null;
  action: string;
  target?: string;
  detail?: string;
}

/* ------------------------------------------------------------------ */
/* Storage adapter: the one seam every database must implement        */
/* ------------------------------------------------------------------ */

export type EntryPatch = Partial<Pick<Entry, "data" | "status" | "position" | "updatedBy" | "pending">> & { newId?: string };

export interface StorageAdapter {
  readonly kind: string;
  /** Throws if the database can't be reached. */
  ping(): Promise<void>;
  close(): Promise<void>;

  // spaces (registered schemas)
  listSpaces(): Promise<SpaceRecord[]>;
  getSpace(id: string): Promise<SpaceRecord | null>;
  putSpace(space: SpaceRecord): Promise<void>;

  // entries
  listEntries(space: string, collection: string, opts?: { status?: Status[] }): Promise<Entry[]>;
  getEntry(space: string, collection: string, id: string): Promise<Entry | null>;
  countEntries(space: string, collection: string): Promise<number>;
  maxPosition(space: string, collection: string): Promise<number>;
  /** Throws `DuplicateIdError` if the id is taken. */
  createEntry(entry: Entry): Promise<void>;
  /** Replaces data/status/position; `newId` renames the entry. Throws `DuplicateIdError` on clash. */
  updateEntry(space: string, collection: string, id: string, patch: EntryPatch): Promise<void>;
  deleteEntry(space: string, collection: string, id: string): Promise<void>;
  /** Inserts the given entries only if the collection is empty. Safe to call concurrently. */
  seedIfEmpty(space: string, collection: string, entries: Entry[]): Promise<boolean>;

  // revisions
  addRevision(rev: Revision): Promise<void>;
  listRevisions(space: string, collection: string, entryId: string, limit?: number): Promise<Revision[]>;

  // users and sessions
  countUsers(): Promise<number>;
  listUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  /** Throws `DuplicateEmailError` if the email is taken. */
  createUser(user: User): Promise<void>;
  updateUser(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<void>;
  createSession(session: Session): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  // form submissions (the inbox)
  addSubmission(sub: Submission): Promise<void>;
  listSubmissions(space: string, opts?: { form?: string; status?: SubmissionStatus }): Promise<Submission[]>;
  getSubmission(space: string, id: string): Promise<Submission | null>;
  updateSubmission(space: string, id: string, patch: Partial<Pick<Submission, "status" | "note">>): Promise<void>;
  countSubmissions(space: string, opts?: { status?: SubmissionStatus }): Promise<number>;

  // audit log
  addAudit(ev: AuditEvent): Promise<void>;
  listAudit(opts?: { space?: string; limit?: number }): Promise<AuditEvent[]>;
}

export class DuplicateIdError extends Error {
  constructor(public readonly collection: string, public readonly id: string) {
    super(`An entry with id "${id}" already exists in ${collection}.`);
  }
}

export class DuplicateEmailError extends Error {
  constructor(public readonly email: string) {
    super(`Someone already has the email ${email}.`);
  }
}

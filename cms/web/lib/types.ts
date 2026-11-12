// The shapes cms/api sends and receives (JSON: dates arrive as ISO strings).
// The schema language (Field, CollectionDef) must match cms/api/src/types.ts.

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
  | (FieldBase & { type: "paragraphs" })
  | (FieldBase & { type: "tags" })
  | (FieldBase & { type: "lines" })
  | (FieldBase & { type: "object"; fields: Field[] })
  | (FieldBase & { type: "list"; fields: Field[]; itemLabel?: string; itemTitle?: string })
  | (FieldBase & { type: "relation"; collection: string; multiple?: boolean });

export interface CollectionDef {
  name: string;
  label: string;
  singular: string;
  description?: string;
  idField: string;
  titleField: string;
  columns?: string[];
  fields: Field[];
  singleton?: boolean;
}

export type Status = "draft" | "review" | "published" | "archived";
export const STATUSES: Status[] = ["draft", "review", "published", "archived"];

export type Role = "editor" | "publisher" | "admin";
export const ROLES: Role[] = ["editor", "publisher", "admin"];

export type SubmissionStatus = "new" | "in-progress" | "done" | "spam";
export const SUBMISSION_STATUSES: SubmissionStatus[] = ["new", "in-progress", "done", "spam"];

export interface SpaceLink {
  href: string;
  label: string;
  role?: Role;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  spaces: "*" | string[];
  createdAt: string;
  disabled?: boolean;
}

export interface Entry {
  space: string;
  collection: string;
  id: string;
  status: Status;
  position: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  pending?: { data: Record<string, unknown>; by: string | null; at: string } | null;
}

export interface Revision {
  collection: string;
  entryId: string;
  status: Status;
  data: Record<string, unknown>;
  author: string | null;
  at: string;
  note?: string;
}

/** A reply an editor already sent about a submission. */
export interface SubmissionReply {
  at: string;
  by: string;
  to: string;
  subject: string;
  body: string;
}

export interface Submission {
  id: string;
  form: string;
  data: Record<string, string>;
  status: SubmissionStatus;
  note?: string;
  replies?: SubmissionReply[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  at: string;
  space: string | null;
  actor: string | null;
  action: string;
  target?: string;
  detail?: string;
}

export interface SpaceSummary {
  id: string;
  label: string;
  title: string;
  collections: number;
  entries: number;
  waiting: number;
  inboxNew: number;
  updatedAt: string;
}

export interface SpaceDetail {
  space: {
    id: string;
    label: string;
    title: string;
    collections: CollectionDef[];
    forms: Record<string, string>;
    links: SpaceLink[];
    webhook: boolean;
    updatedAt: string;
  };
  counts: Record<string, { total: number; published: number }>;
  review: { collection: string; id: string; title: string; pending: boolean }[];
  inboxNew: number;
  recent: AuditEvent[];
}

const RANK: Record<Role, number> = { editor: 1, publisher: 2, admin: 3 };
export const can = (user: Pick<User, "role"> | null | undefined, needed: Role) => !!user && RANK[user.role] >= RANK[needed];

/** en-GB date and time, as the per-app admin showed them. */
export const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB") : "");
export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "");

/** Spaces with a house theme in app/themes.css; anything else renders in the neutral "itc" theme. */
export const THEMES = ["site", "ai", "engineering", "institute", "oss", "research", "portal"] as const;
export const themeFor = (space: string): string => ((THEMES as readonly string[]).includes(space) ? space : "itc");

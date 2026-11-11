// The schema language a house describes its content in. This is the house's half of the contract
// with the CMS: `buildSchema` (../schema.ts) turns these definitions into the JSON body of
// PUT /v1/spaces/:space/schema. Nothing here knows about storage, editors or workflow — the CMS
// owns all of that (see cms/api/src/types.ts, where the same field language is re-declared).
//
// Kept deliberately identical in every house api, like the Khatam mark.

/* ------------------------------------------------------------------ */
/* Fields                                                             */
/* ------------------------------------------------------------------ */

interface FieldBase {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Show (and validate) this field only when a sibling field has one of the given values. */
  showWhen?: { field: string; equals: string | readonly string[] };
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
  /** Extra fields shown as columns in the CMS list. */
  columns?: string[];
  fields: Field[];
  /**
   * Built-in content. It seeds the collection the first time the CMS sees it, and this api serves it
   * read-only when the CMS is unreachable (ARCHITECTURE.md, rule 5).
   */
  seed: () => T[];
  /** If true, the collection holds exactly one entry (a settings-style document). */
  singleton?: boolean;
}

/** An extra page the space's sidebar in cms/web links to (for example the portal's staff tools). */
export interface SpaceLink {
  href: string;
  label: string;
  /** Minimum role that sees the link. Defaults to editor. */
  role?: "editor" | "publisher" | "admin";
}

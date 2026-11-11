// Typed building blocks for long-form pages (contribute, code of conduct, governance, sprints).
// Inline text supports `code`, **bold** and [label](href).

export type Block =
  | string // paragraph
  | { list: string[] }
  | { steps: string[] } // ordered list
  | { code: string; lang: string; title?: string }
  | { note: string; tone?: "mint" | "white" }
  | { defs: { k: string; v: string }[] };

export interface DocSection {
  id: string;
  title: string;
  blocks: Block[];
}

/* ------------------------------------------------------------------ */
/* Editable form: how the admin stores a document (one shape per block) */
/* ------------------------------------------------------------------ */

export const BLOCK_KINDS = ["paragraph", "list", "steps", "code", "note", "definitions"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export const NOTE_TONES = ["mint", "white"] as const;

/** A block as the admin edits it: `kind` says which of the other fields apply. */
export interface EditableBlock {
  kind: BlockKind;
  /** Paragraph text, note text, or the code itself. */
  text?: string;
  /** List or step items. */
  items?: string[];
  lang?: string;
  title?: string;
  tone?: (typeof NOTE_TONES)[number];
  defs?: { k: string; v: string }[];
}

export interface EditableSection {
  id: string;
  title: string;
  blocks: EditableBlock[];
}

/** A long-form page (contribute, governance, code of conduct) as stored in the CMS. */
export interface DocPage {
  slug: string;
  title: string;
  sections: EditableSection[];
}

export function toEditableBlock(b: Block): EditableBlock {
  if (typeof b === "string") return { kind: "paragraph", text: b };
  if ("list" in b) return { kind: "list", items: b.list };
  if ("steps" in b) return { kind: "steps", items: b.steps };
  if ("code" in b) return b.title ? { kind: "code", text: b.code, lang: b.lang, title: b.title } : { kind: "code", text: b.code, lang: b.lang };
  if ("note" in b) return b.tone ? { kind: "note", text: b.note, tone: b.tone } : { kind: "note", text: b.note };
  return { kind: "definitions", defs: b.defs };
}

/** Turns a stored block back into what the page renders. Fields the kind doesn't use are ignored. */
export function fromEditableBlock(b: EditableBlock): Block | null {
  const text = b.text ?? "";
  switch (b.kind) {
    case "paragraph": return text ? text : null;
    case "list": return b.items?.length ? { list: b.items } : null;
    case "steps": return b.items?.length ? { steps: b.items } : null;
    case "code": return text ? { code: text, lang: b.lang || "text", ...(b.title ? { title: b.title } : {}) } : null;
    case "note": return text ? { note: text, ...(b.tone ? { tone: b.tone } : {}) } : null;
    case "definitions": return b.defs?.length ? { defs: b.defs.map((d) => ({ k: d.k ?? "", v: d.v ?? "" })) } : null;
    default: return null;
  }
}

export const toEditableSections = (sections: DocSection[]): EditableSection[] =>
  sections.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks.map(toEditableBlock) }));

export const fromEditableSections = (sections: EditableSection[]): DocSection[] =>
  (sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    blocks: (s.blocks ?? []).map(fromEditableBlock).filter((b): b is Block => b !== null),
  }));

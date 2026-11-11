// Shared content primitives for long-form pages (handbook, RFCs, blog).
// Everything in this app is placeholder copy: swap in real material before launch.

export type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "note"; label?: string; text: string }
  | { kind: "code"; caption?: string; text: string }
  | { kind: "spec"; rows: [string, string][] };

export interface DocSection {
  id: string;
  title: string;
  blocks: Block[];
}

export interface IndexLink {
  id: string;
  num: string;
  label: string;
}

/** Build an "on this page" index from doc sections, numbered under a sheet prefix (e.g. "02" → 02.1, 02.2). */
export function indexFor(sections: { id: string; title: string }[], prefix?: string): IndexLink[] {
  return sections.map((s, i) => ({
    id: s.id,
    num: prefix ? `${prefix}.${i + 1}` : String(i + 1).padStart(2, "0"),
    label: s.title,
  }));
}

/** Common status vocabulary. Each value maps to a `.status.<value>` chip in globals.css. */
export type Chip =
  | "stable" | "beta" | "design"
  | "accepted" | "proposed" | "draft" | "superseded" | "withdrawn"
  | "done" | "now" | "next" | "later"
  | "unknown" | "open" | "volunteer" | "outage";

/* ------------------------------------------------------------------ */
/* Stored form of blocks, as the admin edits them                      */
/* ------------------------------------------------------------------ */
// The CMS field language has no tagged unions or tuples, so a block is stored as one flat object
// with a `kind` and the fields that kind uses. These pure helpers convert both ways.

export const BLOCK_KINDS = ["paragraph", "list", "note", "code", "spec"] as const;
export type StoredBlockKind = (typeof BLOCK_KINDS)[number];

export interface StoredBlock {
  kind: StoredBlockKind;
  text?: string;
  label?: string;
  caption?: string;
  items?: string[];
  ordered?: boolean;
  rows?: { key: string; value: string }[];
}

export interface StoredSection { id: string; title: string; blocks?: StoredBlock[] }

export function toStoredBlock(b: Block): StoredBlock {
  switch (b.kind) {
    case "p": return { kind: "paragraph", text: b.text };
    case "list": return { kind: "list", items: b.items, ordered: !!b.ordered };
    case "note": return b.label ? { kind: "note", label: b.label, text: b.text } : { kind: "note", text: b.text };
    case "code": return b.caption ? { kind: "code", caption: b.caption, text: b.text } : { kind: "code", text: b.text };
    case "spec": return { kind: "spec", rows: b.rows.map(([key, value]) => ({ key, value })) };
  }
}

/** Converts stored blocks back to render blocks, dropping any block that has nothing to show. */
export function fromStoredBlocks(stored: StoredBlock[] | undefined): Block[] {
  const out: Block[] = [];
  for (const b of stored ?? []) {
    const text = b.text?.trim() ?? "";
    switch (b.kind) {
      case "paragraph": if (text) out.push({ kind: "p", text }); break;
      case "list": if (b.items?.length) out.push({ kind: "list", items: b.items, ordered: !!b.ordered }); break;
      case "note": if (text) out.push({ kind: "note", label: b.label || undefined, text }); break;
      case "code": if (b.text) out.push({ kind: "code", caption: b.caption || undefined, text: b.text }); break;
      case "spec": if (b.rows?.length) out.push({ kind: "spec", rows: b.rows.map((r) => [r.key ?? "", r.value ?? ""] as [string, string]) }); break;
    }
  }
  return out;
}

export const toStoredSections = (sections: DocSection[]): StoredSection[] =>
  sections.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks.map(toStoredBlock) }));

export const fromStoredSections = (sections: StoredSection[] | undefined): DocSection[] =>
  (sections ?? []).map((s) => ({ id: s.id, title: s.title, blocks: fromStoredBlocks(s.blocks) }));

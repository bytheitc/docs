// The docs as a model: pages, the sidebar, search, and the edits staff make.
//
// On disk (and in the repository) a page is one Markdown file with a small header:
//
//   ---
//   title: Contributing
//   description: How to pick a task, claim it and get it merged.
//   ---
//   The page, in Markdown.
//
// `contributing.md` is served at /contributing, `products/hifz.md` at /products/hifz, and
// `index.md` is the home page. `nav.json` orders the sidebar: sections, each a list of slugs. Only
// pages in nav.json (and the home page) are public: a page left out is hidden from readers, its
// address and search included, but stays in the repository and in the editor. That is how a draft is
// kept out of sight until it's ready, and how a finished page is taken down without deleting it.
import type { Author, Change, DocsSource, FileVersion, Revision } from "./source.js";

export const NAV_FILE = "nav.json";
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,3}$/;
export const MAX_MARKDOWN = 200_000;

export interface NavSection {
  title: string;
  pages: string[];
}
export interface Nav {
  sections: NavSection[];
}

export interface PageMeta {
  slug: string;
  title: string;
  description: string;
}

export interface Page extends PageMeta {
  markdown: string;
  sha: string;
  /** The sidebar section it is listed under, if any. */
  section: string | null;
}

export interface Heading {
  depth: 2 | 3;
  text: string;
  id: string;
}

export interface SearchEntry extends PageMeta {
  section: string | null;
  headings: Heading[];
  text: string;
}

/* ------------------------------------------------------------------ */
/* Parsing                                                            */
/* ------------------------------------------------------------------ */

/** Reads the header. Only `key: value` lines; anything fancier isn't needed and isn't accepted. */
export function parsePage(slug: string, raw: string): Omit<Page, "sha" | "section"> {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const meta: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = unquote(line.slice(i + 1).trim());
    }
  }
  const markdown = m ? text.slice(m[0].length) : text;
  const firstHeading = /^#\s+(.+)$/m.exec(markdown)?.[1];
  return {
    slug,
    title: meta.title || firstHeading || slug.split("/").pop()!.replace(/-/g, " "),
    description: meta.description || "",
    markdown: markdown.replace(/^\n+/, ""),
  };
}

const unquote = (v: string) => (/^(["']).*\1$/.test(v) ? v.slice(1, -1) : v);
const quote = (v: string) => (/^[\s"']|[\s]$|:\s|#/.test(v) ? JSON.stringify(v) : v);

export function serializePage(p: { title: string; description: string; markdown: string }): string {
  const one = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();
  const head = [`title: ${quote(one(p.title))}`, ...(p.description.trim() ? [`description: ${quote(one(p.description))}`] : [])];
  return `---\n${head.join("\n")}\n---\n\n${p.markdown.replace(/\r\n/g, "\n").trim()}\n`;
}

/** Heading ids, the same way docs/web makes them, so search results can link to a section. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function headingsOf(markdown: string): Heading[] {
  const out: Heading[] = [];
  const seen = new Map<string, number>();
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^(##|###)\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[`*_]/g, "");
    const base = slugify(text) || "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ depth: m[1].length as 2 | 3, text, id: n ? `${base}-${n}` : base });
  }
  return out;
}

/** The words of a page, without Markdown, for search. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s*\[!\w+\]\s*$/gm, " ")
    .replace(/[#>*_|~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNav(raw: string | undefined): Nav {
  if (!raw) return { sections: [] };
  try {
    const v = JSON.parse(raw) as { sections?: unknown };
    if (!Array.isArray(v.sections)) return { sections: [] };
    return {
      sections: v.sections
        .filter((s): s is { title: string; pages: unknown[] } => typeof s === "object" && s !== null && typeof (s as NavSection).title === "string" && Array.isArray((s as NavSection).pages))
        .map((s) => ({ title: s.title, pages: s.pages.filter((p): p is string => typeof p === "string" && SLUG.test(p)) })),
    };
  } catch {
    return { sections: [] };
  }
}

export const serializeNav = (nav: Nav) => `${JSON.stringify(nav, null, 2)}\n`;

/* ------------------------------------------------------------------ */
/* The docs                                                           */
/* ------------------------------------------------------------------ */

interface State {
  pages: Map<string, Page>;
  nav: Nav;
  navSha: string | null;
  at: number;
}

export class EditError extends Error {
  constructor(public readonly status: number, message: string, public readonly fields?: Record<string, string>) {
    super(message);
  }
}

export class Docs {
  private state: State | undefined;
  private loading: Promise<State> | undefined;

  constructor(readonly source: DocsSource, private readonly ttlMs: number) {}

  /** Drops the cached copy, so the next read sees the source as it is now. */
  invalidate() {
    this.state = undefined;
  }

  private async load(): Promise<State> {
    if (this.state && Date.now() - this.state.at < this.ttlMs) return this.state;
    this.loading ??= (async () => {
      const files = await this.source.snapshot();
      const navFile = files.get(NAV_FILE);
      const nav = parseNav(navFile?.content);
      const sectionOf = new Map<string, string>();
      for (const s of nav.sections) for (const p of s.pages) if (!sectionOf.has(p)) sectionOf.set(p, s.title);
      const pages = new Map<string, Page>();
      for (const [p, f] of files) {
        if (!p.endsWith(".md")) continue;
        const slug = p.slice(0, -3);
        if (!SLUG.test(slug)) continue;
        pages.set(slug, { ...parsePage(slug, f.content), sha: f.sha, section: sectionOf.get(slug) ?? null });
      }
      return { pages, nav, navSha: navFile?.sha ?? null, at: Date.now() };
    })().finally(() => { this.loading = undefined; });
    this.state = await this.loading;
    return this.state;
  }

  /** The sidebar: listed pages that exist, in order. */
  async nav(): Promise<{ sections: { title: string; pages: PageMeta[] }[] }> {
    const { nav, pages } = await this.load();
    return {
      sections: nav.sections
        .map((s) => ({ title: s.title, pages: s.pages.map((slug) => pages.get(slug)).filter((p): p is Page => Boolean(p)).map(meta) }))
        .filter((s) => s.pages.length > 0),
    };
  }

  async rawNav(): Promise<{ nav: Nav; sha: string | null }> {
    const s = await this.load();
    return { nav: s.nav, sha: s.navSha };
  }

  async page(slug: string): Promise<{ page: Page; headings: Heading[]; prev: PageMeta | null; next: PageMeta | null } | null> {
    const s = await this.load();
    const page = s.pages.get(slug);
    if (!page) return null;
    const order = s.nav.sections.flatMap((x) => x.pages).filter((p, i, all) => s.pages.has(p) && all.indexOf(p) === i);
    const i = order.indexOf(slug);
    const at = (j: number) => (j >= 0 && j < order.length ? meta(s.pages.get(order[j])!) : null);
    return { page, headings: headingsOf(page.markdown), prev: i >= 0 ? at(i - 1) : null, next: i >= 0 ? at(i + 1) : null };
  }

  async all(): Promise<Page[]> {
    const s = await this.load();
    return [...s.pages.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  }

  /** Whether readers may see a page: the home page, or one listed in the sidebar. */
  async isPublic(slug: string): Promise<boolean> {
    const s = await this.load();
    return slug === "index" || s.nav.sections.some((x) => x.pages.includes(slug));
  }

  async searchIndex(): Promise<SearchEntry[]> {
    const s = await this.load();
    return [...s.pages.values()].filter((p) => p.slug === "index" || p.section !== null).map((p) => ({
      ...meta(p),
      section: p.section,
      headings: headingsOf(p.markdown),
      text: plainText(p.markdown).slice(0, 6000),
    }));
  }

  /* ---------------- edits ---------------- */

  private async commit(changes: Change[], message: string, author: Author) {
    if (!this.source.writable) throw new EditError(503, "The docs are read-only here: no GitHub token is configured.");
    const result = await this.source.commit(changes, message, author);
    this.invalidate();
    return result;
  }

  /** Saves a page's new text. `sha` is the version the editor opened. */
  async save(slug: string, input: { title: string; description: string; markdown: string; sha: string; message?: string }, author: Author) {
    validatePage(input);
    const s = await this.load();
    if (!s.pages.has(slug)) throw new EditError(404, "That page doesn't exist any more.");
    const content = serializePage(input);
    return this.commit([{ path: `${slug}.md`, content, expectedSha: input.sha }], input.message?.trim() || `docs: update “${input.title.trim()}”`, author);
  }

  /** Creates a page, and lists it in a sidebar section when one is named. */
  async create(input: { slug: string; title: string; description: string; markdown: string; section?: string; message?: string }, author: Author) {
    if (!SLUG.test(input.slug)) throw new EditError(400, "Use lowercase letters, numbers and dashes, with / for a folder.", { slug: "Like products/hifz." });
    validatePage(input);
    const s = await this.load();
    if (s.pages.has(input.slug)) throw new EditError(409, "A page already lives at that address.", { slug: "Taken." });
    const changes: Change[] = [{ path: `${input.slug}.md`, content: serializePage(input), expectedSha: null }];
    if (input.section) {
      const nav = structuredClone(s.nav);
      const section = nav.sections.find((x) => x.title === input.section) ?? (nav.sections.push({ title: input.section, pages: [] }), nav.sections[nav.sections.length - 1]);
      section.pages.push(input.slug);
      changes.push({ path: NAV_FILE, content: serializeNav(nav), expectedSha: s.navSha });
    }
    return this.commit(changes, input.message?.trim() || `docs: add “${input.title.trim()}”`, author);
  }

  /** Moves a page to a new address, and points the sidebar at it, in one commit. */
  async move(from: string, to: string, sha: string, author: Author) {
    if (!SLUG.test(to)) throw new EditError(400, "Use lowercase letters, numbers and dashes, with / for a folder.", { to: "Like products/hifz." });
    const s = await this.load();
    const page = s.pages.get(from);
    if (!page) throw new EditError(404, "That page doesn't exist any more.");
    if (from === "index") throw new EditError(400, "The home page stays at the root.");
    if (s.pages.has(to)) throw new EditError(409, "A page already lives at that address.", { to: "Taken." });
    const raw = (await this.source.snapshot()).get(`${from}.md`);
    if (!raw || raw.sha !== sha) throw new EditError(409, "That page was changed by someone else since you opened it.");
    const changes: Change[] = [
      { path: `${to}.md`, content: raw.content, expectedSha: null },
      { path: `${from}.md`, content: null, expectedSha: sha },
    ];
    if (s.nav.sections.some((x) => x.pages.includes(from))) {
      const nav: Nav = { sections: s.nav.sections.map((x) => ({ ...x, pages: x.pages.map((p) => (p === from ? to : p)) })) };
      changes.push({ path: NAV_FILE, content: serializeNav(nav), expectedSha: s.navSha });
    }
    return this.commit(changes, `docs: move “${page.title}” to /${to}`, author);
  }

  async remove(slug: string, sha: string, author: Author) {
    const s = await this.load();
    const page = s.pages.get(slug);
    if (!page) throw new EditError(404, "That page doesn't exist any more.");
    if (slug === "index") throw new EditError(400, "The home page can't be deleted.");
    const changes: Change[] = [{ path: `${slug}.md`, content: null, expectedSha: sha }];
    if (s.nav.sections.some((x) => x.pages.includes(slug))) {
      const nav: Nav = { sections: s.nav.sections.map((x) => ({ ...x, pages: x.pages.filter((p) => p !== slug) })) };
      changes.push({ path: NAV_FILE, content: serializeNav(nav), expectedSha: s.navSha });
    }
    return this.commit(changes, `docs: delete “${page.title}”`, author);
  }

  /** Replaces the sidebar. Slugs that don't exist are refused, so the sidebar can't link to nothing. */
  async saveNav(nav: Nav, sha: string | null, author: Author) {
    const s = await this.load();
    const fields: Record<string, string> = {};
    nav.sections.forEach((sec, i) => {
      if (!sec.title.trim()) fields[`sections.${i}.title`] = "A section needs a title.";
      for (const p of sec.pages) if (!s.pages.has(p)) fields[`sections.${i}.pages`] = `No page at /${p}.`;
    });
    if (Object.keys(fields).length) throw new EditError(400, "The sidebar has problems.", fields);
    const clean: Nav = { sections: nav.sections.map((x) => ({ title: x.title.trim(), pages: [...new Set(x.pages)] })) };
    return this.commit([{ path: NAV_FILE, content: serializeNav(clean), expectedSha: sha }], "docs: reorder the sidebar", author);
  }

  history(slug: string): Promise<Revision[]> {
    return this.source.history(`${slug}.md`);
  }

  async snapshotFiles(): Promise<Map<string, FileVersion>> {
    return this.source.snapshot();
  }
}

const meta = (p: Page): PageMeta => ({ slug: p.slug, title: p.title, description: p.description });

function validatePage(p: { title: string; description: string; markdown: string }) {
  const fields: Record<string, string> = {};
  if (!p.title.trim()) fields.title = "A page needs a title.";
  if (p.title.length > 120) fields.title = "At most 120 characters.";
  if (p.description.length > 300) fields.description = "At most 300 characters.";
  if (p.markdown.length > MAX_MARKDOWN) fields.markdown = "This page is too long; split it in two.";
  if (Object.keys(fields).length) throw new EditError(400, "Please fix the highlighted fields.", fields);
}

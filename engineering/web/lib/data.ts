// Async content access for ITC Engineering pages. Everything here reads published content via the CMS.
// The admin stores some things differently from how pages render them (blocks, fact tuples, empty values);
// the normalisers below turn stored entries back into the shapes in lib/*.ts.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/api";
import type { Post } from "@/lib/blog";
import type { CareersPage, Role } from "@/lib/careers";
import { fromStoredBlocks, fromStoredSections, type StoredBlock, type StoredSection } from "@/lib/content";
import type { Chapter } from "@/lib/handbook";
import type { HomeSheet } from "@/lib/home";
import { buildNav, type NavItem } from "@/lib/nav";
import type { Platform } from "@/lib/platforms";
import type { Rfc } from "@/lib/rfcs";
import type { StatusSheet } from "@/lib/status";
import type { Team } from "@/lib/teams";

type Stored<T, K extends keyof T, S> = Omit<T, K> & { [P in K]?: S };
const dash = (v: string | undefined | null) => (v && v.trim() ? v : "—");

/* Platforms ---------------------------------------------------------- */

function normalisePlatform(p: Platform): Platform {
  return {
    ...p,
    principles: p.principles ?? [],
    interfaces: (p.interfaces ?? []).map((i) => ({ ...i, note: i.note ?? "" })),
    dependencies: (p.dependencies ?? []).map((d) => ({ ...d, ref: d.ref || undefined, note: d.note ?? "" })),
    roadmap: (p.roadmap ?? []).map((r) => ({ ...r, note: r.note ?? "" })),
    runbook: { path: p.runbook?.path ?? "", covers: p.runbook?.covers ?? [] },
  };
}

export const getPlatforms = async () => (await getPublished<Platform>("platforms")).map(normalisePlatform);
export const getPlatform = async (slug: string) => {
  const p = await getPublishedOne<Platform>("platforms", slug);
  return p && normalisePlatform(p);
};

/* Teams -------------------------------------------------------------- */

function normaliseTeam(t: Team): Team {
  return {
    ...t,
    scope: t.scope ?? [],
    notScope: t.notScope ?? [],
    reach: (t.reach ?? []).map((r) => ({ ...r, href: r.href || undefined, note: r.note ?? "" })),
    rhythm: t.rhythm ?? [],
  };
}

export const getTeams = async () => (await getPublished<Team>("teams")).map(normaliseTeam);
export const getTeam = async (slug: string) => {
  const t = await getPublishedOne<Team>("teams", slug);
  return t && normaliseTeam(t);
};

/* Handbook ----------------------------------------------------------- */

type StoredChapter = Stored<Chapter, "sections", StoredSection[]>;
const normaliseChapter = (c: StoredChapter): Chapter => ({ ...c, sections: fromStoredSections(c.sections) });

export const getChapters = async () => (await getPublished<StoredChapter>("handbook")).map(normaliseChapter);
export const getChapter = async (slug: string) => {
  const c = await getPublishedOne<StoredChapter>("handbook", slug);
  return c && normaliseChapter(c);
};

/* RFCs --------------------------------------------------------------- */

type StoredRfc = Omit<Rfc, "motivation" | "design" | "alternatives" | "decision"> & {
  motivation?: StoredBlock[]; design?: StoredBlock[]; alternatives?: StoredBlock[]; decision?: StoredBlock[];
};
const normaliseRfc = (r: StoredRfc): Rfc => ({
  ...r,
  date: dash(r.date),
  platforms: r.platforms ?? [],
  motivation: fromStoredBlocks(r.motivation),
  design: fromStoredBlocks(r.design),
  alternatives: fromStoredBlocks(r.alternatives),
  decision: fromStoredBlocks(r.decision),
  supersededBy: r.supersededBy || undefined,
});

export const getRfcs = async () => (await getPublished<StoredRfc>("rfcs")).map(normaliseRfc);
export const getRfc = async (id: string) => {
  const r = await getPublishedOne<StoredRfc>("rfcs", id);
  return r && normaliseRfc(r);
};

/* Blog --------------------------------------------------------------- */

type StoredPost = Omit<Post, "facts" | "sections"> & { facts?: { label: string; value: string }[] | null; sections?: StoredSection[] };
const normalisePost = (p: StoredPost): Post => ({
  ...p,
  date: dash(p.date),
  platforms: p.platforms ?? [],
  facts: p.facts?.length ? p.facts.map((f) => [f.label, f.value] as [string, string]) : undefined,
  sections: fromStoredSections(p.sections),
});

export const getPosts = async () => (await getPublished<StoredPost>("blog")).map(normalisePost);
export const getPost = async (slug: string) => {
  const p = await getPublishedOne<StoredPost>("blog", slug);
  return p && normalisePost(p);
};

/* Careers ------------------------------------------------------------ */

export const getRoles = () => getPublished<Role>("roles");

export async function getCareersPage(): Promise<CareersPage> {
  const c = await getSingleton<CareersPage>("careers");
  return {
    id: "careers",
    email: c?.email || "",
    hiring: c?.hiring ?? [],
    volunteering: c?.volunteering ?? [],
  };
}

/* Status ------------------------------------------------------------- */

export async function getStatusSheet(): Promise<StatusSheet> {
  const s = await getSingleton<StatusSheet>("status");
  // Only when engineering/api is unreachable; it otherwise answers with the CMS's copy or its own seed.
  if (!s) return { id: "status", feed: "not connected", lastChecked: "—", openIncidents: "—", readings: [], incidents: [] };
  return {
    ...s,
    feed: s.feed || "not connected",
    lastChecked: dash(s.lastChecked),
    openIncidents: dash(s.openIncidents),
    banner: s.banner?.trim() || undefined,
    readings: (s.readings ?? []).map((r) => ({ ...r, current: r.current ?? "no data", uptime: dash(r.uptime), lastIncident: dash(r.lastIncident) })),
    incidents: s.incidents ?? [],
  };
}

/* Home --------------------------------------------------------------- */

export async function getHomeSheet(): Promise<HomeSheet> {
  const h = await getSingleton<HomeSheet>("home");
  return { id: "home", practices: h?.practices ?? [], stack: h?.stack ?? [] };
}

/* Navigation --------------------------------------------------------- */

/** The sidebar tree: fixed sheets, with sub-pages from published platforms, chapters and teams. */
export async function getNav(): Promise<NavItem[]> {
  const [platforms, chapters, teams] = await Promise.all([getPlatforms(), getChapters(), getTeams()]);
  return buildNav({
    "/platforms": platforms.map((p) => ({ href: `/platforms/${p.slug}`, code: p.id, label: p.name })),
    "/handbook": chapters.map((c) => ({ href: `/handbook/${c.slug}`, code: c.num, label: c.title })),
    "/teams": teams.map((t) => ({ href: `/teams/${t.slug}`, code: t.code, label: t.name })),
  });
}

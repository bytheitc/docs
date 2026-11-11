// Async content access for ITC AI pages. Everything here reads published content via the CMS.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/cms/content";
import type { Principle } from "@/lib/charter";
import type { Call, CollaborateSettings } from "@/lib/collaborate";
import type { Benchmark, EvalRow } from "@/lib/evals";
import type { Guide } from "@/lib/guides";
import type { FocusCard, HomeContent, LabItem } from "@/lib/home";
import { PENDING, type CardField, type ModelCard } from "@/lib/model-cards";
import type { Project } from "@/lib/projects";

// The editor drops empty optional values; pages expect lists to exist and unfilled card values to read "pending".
const pendingIfEmpty = (v: string | undefined) => (v && v.trim() ? v : PENDING);
const fields = (list: CardField[] | undefined) => (list ?? []).map((f) => ({ ...f, value: pendingIfEmpty(f.value) }));

function normaliseCard(m: ModelCard): ModelCard {
  return {
    ...m,
    facts: fields(m.facts),
    data: fields(m.data),
    evaluation: (m.evaluation ?? []).map((e) => ({ ...e, result: pendingIfEmpty(e.result) })),
    intendedUse: m.intendedUse ?? [],
    outOfScope: m.outOfScope ?? [],
    limitations: m.limitations ?? [],
  };
}

function normaliseProject(p: Project): Project {
  return {
    ...p,
    body: p.body ?? [],
    goals: p.goals ?? [],
    principles: p.principles ?? [],
    houses: p.houses ?? [],
    links: p.links ?? [],
    evals: p.evals ?? [],
    modelCard: p.modelCard || undefined,
    guide: p.guide || undefined,
  };
}

const normaliseGuide = (g: Guide): Guide => ({
  ...g,
  principles: g.principles ?? [],
  sections: (g.sections ?? []).map((s) => ({ ...s, list: s.list?.length ? s.list : undefined })),
  checklist: g.checklist ?? [],
});

const normaliseBenchmark = (b: Benchmark): Benchmark => ({
  ...b,
  metrics: (b.metrics ?? []).map((m) => ({ ...m, result: m.result?.trim() || undefined })),
  run: b.run || undefined,
});

export const getPrinciples = () => getPublished<Principle>("principles");

export const getProjects = async () => (await getPublished<Project>("projects")).map(normaliseProject);
export const getProject = async (slug: string) => {
  const p = await getPublishedOne<Project>("projects", slug);
  return p && normaliseProject(p);
};

export const getBenchmarks = async () => (await getPublished<Benchmark>("benchmarks")).map(normaliseBenchmark);
export const getResults = async () =>
  (await getPublished<EvalRow>("results")).map((r) => ({ ...r, cells: r.cells ?? [] }));

export const getModelCards = async () => (await getPublished<ModelCard>("model-cards")).map(normaliseCard);
export const getModelCard = async (slug: string) => {
  const m = await getPublishedOne<ModelCard>("model-cards", slug);
  return m && normaliseCard(m);
};

export const getGuides = async () => (await getPublished<Guide>("guides")).map(normaliseGuide);
export const getGuide = async (slug: string) => {
  const g = await getPublishedOne<Guide>("guides", slug);
  return g && normaliseGuide(g);
};

export const getCalls = () => getPublished<Call>("calls");

export const getInterests = async () => (await getSingleton<CollaborateSettings>("collaborate"))?.interests ?? [];

/** Home-page lists; empty (and the section hidden) if the singleton is unpublished. */
export async function getHome(): Promise<{ focus: FocusCard[]; lab: LabItem[] }> {
  const h = await getSingleton<HomeContent>("home");
  return { focus: h?.focus ?? [], lab: h?.lab ?? [] };
}

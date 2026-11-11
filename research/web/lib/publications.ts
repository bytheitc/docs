// Placeholder publication index. Replace with the real catalogue.
export type PubType = "Paper" | "Working note" | "Dataset" | "Report";
export type Group = "Language & Text" | "Trust & Evaluation" | "Society & Policy" | "Systems";

export const PUB_TYPES: PubType[] = ["Paper", "Working note", "Dataset", "Report"];
export const GROUP_NAMES: Group[] = ["Language & Text", "Trust & Evaluation", "Society & Policy", "Systems"];

export interface Publication {
  id: string;
  title: string;
  type: PubType;
  group: Group;
  year: number;
  summary: string;
  tags: string[];
  /** Abstract, one string per paragraph. */
  abstract: string[];
  keywords: string[];
  /** Houses this work was done with, if any (display names). */
  with?: string[];
  /** Placeholder repository name on ITC Open Source, when code or data accompany the work. */
  repo?: string;
  /** Slug of the datasheet in lib/datasets.ts, when the publication is or releases a dataset. */
  dataset?: string;
}

export const groupSlug = (g: Group) => g.toLowerCase().replace(/&/g, "and").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

/** Same group or shared tags/keywords, best matches first. */
export function relatedPublications(p: Publication, all: Publication[], limit = 3): Publication[] {
  return all.filter((q) => q.id !== p.id)
    .map((q) => {
      let score = q.group === p.group ? 2 : 0;
      score += q.tags.filter((t) => p.tags.includes(t)).length;
      score += q.keywords.filter((k) => p.keywords.includes(k)).length;
      return { q, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.q.year - a.q.year)
    .slice(0, limit)
    .map((x) => x.q);
}

export function citation(p: Publication): string {
  return `ITC Research, ${p.group} Group (${p.year}). ${p.title}. ITC Research ${p.type}, ${p.id}.`;
}

export function bibtex(p: Publication): string {
  const key = p.id.replace(/-/g, "");
  const kind = p.type === "Dataset" ? "misc" : p.type === "Paper" ? "article" : "techreport";
  return `@${kind}{${key},\n  title  = {${p.title}},\n  author = {{ITC Research, ${p.group} Group}},\n  year   = {${p.year}},\n  note   = {${p.type}, ${p.id}}\n}`;
}

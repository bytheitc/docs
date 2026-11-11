// Seed content for the repository registry: the built-in repos, editable in the admin (Repositories).
// Package names, commands and APIs below are illustrative: nothing here is published yet.
// Later the contributor portal will supply live repo and issue data; until then this is CMS content.
import { house, type HouseId } from "@/lib/houses";

export const LANGS = ["TypeScript", "Python", "Go", "Rust"] as const;
export type Lang = (typeof LANGS)[number];

export interface Maintainer {
  role: string;
  name: string; // "TBA" until a real person signs up
}

/** A good first issue as stored with its repo. */
export interface RepoIssue {
  title: string;
  label: string;
  /** Shown in "good first issues" on the home page. */
  featured?: boolean;
  /** The GitHub issue number, once the issue exists. Enables claiming on the contributor portal. */
  number?: number;
}

/** A good first issue with the slug of the repo it belongs to. */
export interface Issue extends RepoIssue {
  repo: string;
}

export interface Snippet {
  lang: string; // shown in the code block header
  code: string;
}

/** A repo as stored in the CMS. */
export interface RepoRecord {
  slug: string;
  name: string;
  desc: string;
  lang: Lang;
  license: string;
  houseId: HouseId;
  /** Long-form README-style overview, one string per paragraph. */
  overview: string[];
  features: string[];
  install: Snippet;
  usage: Snippet;
  maintainers: Maintainer[];
  issues: RepoIssue[];
}

/** A repo as pages use it: owning house name and issue repo slugs filled in. */
export interface Repo extends Omit<RepoRecord, "issues"> {
  house: string;
  issues: Issue[];
}

// Hand-picked issues featured on the home page.
const FEATURED = [
  "Mirror icon direction automatically in RTL layouts",
  "Add Urdu and Malay month names",
  "Document high-latitude adjustment options",
  "Add a 10-point star construction",
  "Write tests for the gold nisab threshold",
];

const issues = (list: [string, string][]): RepoIssue[] =>
  list.map(([title, label]) => (FEATURED.includes(title) ? { title, label, featured: true } : { title, label }));

/** Fills in what pages derive from a stored repo. */
export const toRepo = (r: RepoRecord): Repo => ({
  ...r,
  house: house(r.houseId).name,
  issues: (r.issues ?? []).map((i) => ({ ...i, repo: r.slug })),
});

export const findRepo = (repos: Repo[], slug: string): Repo | undefined => repos.find((r) => r.slug === slug);

export const allIssues = (repos: Repo[]): Issue[] => repos.flatMap((r) => r.issues);

export const featuredIssues = (repos: Repo[]): Issue[] => allIssues(repos).filter((i) => i.featured);
